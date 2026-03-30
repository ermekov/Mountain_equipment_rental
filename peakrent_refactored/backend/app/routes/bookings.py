"""
app/routes/bookings.py — Маршруты бронирований

Blueprint: bookings_bp → префикс /api/bookings

Маршруты:
    POST   /api/bookings       — создать бронирование
    GET    /api/bookings/my    — список моих бронирований
    GET    /api/bookings/<id>  — получить бронирование по ID
    DELETE /api/bookings/<id>  — отменить бронирование

Логика создания бронирования:
    1. Проверяем валидность дат
    2. Проверяем наличие снаряжения
    3. Рассчитываем итоговую стоимость
    4. Создаём Booking + BookingItem записи
    5. Если оплата наличными → сразу confirmed
"""

from datetime import datetime, date
from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import User, Equipment, Booking, BookingItem
from ..utils.auth import login_required, optional_auth

bookings_bp = Blueprint("bookings", __name__)


@bookings_bp.route("", methods=["POST"])
@optional_auth
def create_booking():
    """
    Создаёт новое бронирование.

    Поддерживает два режима:
    1. Авторизованный пользователь (g.user задан через @optional_auth)
    2. Гостевое бронирование (передаём phone + name в теле)

    Body: {
        "items": [
            {"equipment_id": 1, "quantity": 1, "size": "160"}
        ],
        "start_date":      "2025-02-01",
        "end_date":        "2025-02-03",
        "payment_method":  "kaspi",     // kaspi | card | cash
        "with_insurance":  true,        // +1500₸/день
        "name":            "Айдос",     // для гостей
        "phone":           "+77071234567" // для гостей
    }

    Response: объект бронирования со статусом "pending" (или "confirmed" для cash)
    """
    data = request.get_json() or {}

    # Проверяем обязательные поля
    required_fields = ["items", "start_date", "end_date", "payment_method"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Поле '{field}' обязательно"}), 400

    # Парсим и валидируем даты
    try:
        start_date = date.fromisoformat(data["start_date"])
        end_date   = date.fromisoformat(data["end_date"])
    except ValueError:
        return jsonify({"error": "Неверный формат даты. Используйте YYYY-MM-DD"}), 400

    if end_date <= start_date:
        return jsonify({"error": "Дата возврата должна быть позже даты выдачи"}), 400

    if start_date < date.today():
        return jsonify({"error": "Нельзя бронировать прошедшие даты"}), 400

    days = (end_date - start_date).days

    # Определяем пользователя (авторизованный или гостевой)
    user = g.user
    if not user:
        phone = data.get("phone", "").strip()
        if not phone:
            return jsonify({"error": "Требуется авторизация или поле 'phone'"}), 401

        # Гостевое бронирование: находим или создаём пользователя
        user = User.query.filter_by(phone=phone).first()
        if not user:
            name = data.get("name", phone[-4:])
            user = User(phone=phone, name=name)
            db.session.add(user)
            db.session.flush()  # Получаем ID без коммита

    # Валидируем позиции и рассчитываем стоимость
    total_price = 0
    items_to_create = []

    for item_data in data["items"]:
        equipment_id = item_data.get("equipment_id")
        quantity     = max(1, int(item_data.get("quantity", 1)))
        size         = item_data.get("size")

        # Проверяем существование снаряжения
        equipment = Equipment.query.get(equipment_id)
        if not equipment or not equipment.is_active:
            return jsonify({"error": f"Снаряжение #{equipment_id} не найдено"}), 404

        # Проверяем доступное количество
        available = equipment.available_stock(start_date, end_date)
        if available < quantity:
            return jsonify({
                "error": f"'{equipment.name_ru}' доступно только {available} шт. на эти даты"
            }), 400

        subtotal     = equipment.price_per_day * days * quantity
        total_price += subtotal
        items_to_create.append({
            "equipment":    equipment,
            "quantity":     quantity,
            "size":         size,
            "price_per_day": equipment.price_per_day,
            "subtotal":     subtotal,
        })

    # Добавляем стоимость страховки (1500₸ в день за единицу)
    if data.get("with_insurance"):
        total_items = sum(i["quantity"] for i in items_to_create)
        insurance_cost = 1500 * days * total_items
        total_price += insurance_cost

    # Создаём бронирование
    booking = Booking(
        user_id=user.id,
        start_date=start_date,
        end_date=end_date,
        total_price=total_price,
        payment_method=data["payment_method"],
        status="pending",
        notes=data.get("notes", ""),
    )
    db.session.add(booking)
    db.session.flush()  # Получаем booking.id

    # Создаём позиции бронирования
    for item_data in items_to_create:
        booking_item = BookingItem(
            booking_id=booking.id,
            equipment_id=item_data["equipment"].id,
            quantity=item_data["quantity"],
            size=item_data["size"],
            price_per_day=item_data["price_per_day"],
            subtotal=item_data["subtotal"],
        )
        db.session.add(booking_item)

    # Наличные оплачиваются при получении — сразу подтверждаем
    if data["payment_method"] == "cash":
        booking.status = "confirmed"

    db.session.commit()
    return jsonify(booking.to_dict()), 201


@bookings_bp.route("/my", methods=["GET"])
@login_required
def my_bookings():
    """
    Возвращает список бронирований текущего пользователя.
    Отсортированы от новых к старым.
    """
    bookings = (
        Booking.query
        .filter_by(user_id=g.user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    return jsonify([b.to_dict() for b in bookings]), 200


@bookings_bp.route("/<int:booking_id>", methods=["GET"])
@login_required
def get_booking(booking_id):
    """
    Возвращает детали конкретного бронирования.

    Пользователь может видеть только свои бронирования.
    Администратор может видеть любые.
    """
    booking = Booking.query.get_or_404(booking_id)

    # Проверяем права доступа
    if booking.user_id != g.user.id and g.user.role != "admin":
        return jsonify({"error": "Доступ запрещён"}), 403

    return jsonify(booking.to_dict()), 200


@bookings_bp.route("/<int:booking_id>", methods=["DELETE"])
@login_required
def cancel_booking(booking_id):
    """
    Отменяет бронирование.

    Можно отменить только бронирования со статусом pending или confirmed.
    Пользователь может отменить только свои бронирования.
    """
    booking = Booking.query.get_or_404(booking_id)

    # Проверяем права доступа
    if booking.user_id != g.user.id and g.user.role != "admin":
        return jsonify({"error": "Доступ запрещён"}), 403

    # Проверяем, можно ли отменить
    if booking.status not in ("pending", "confirmed"):
        return jsonify({
            "error": f"Нельзя отменить бронирование со статусом '{booking.status}'"
        }), 400

    booking.status = "cancelled"
    db.session.commit()

    return jsonify({"message": "Бронирование успешно отменено"}), 200
