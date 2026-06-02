from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import Equipment, Booking, BookingItem
from ..utils.auth import login_required
from ..services.email_service import EmailService

bookings_bp = Blueprint("bookings", __name__)


def _normalize_booking_signature(items):
    normalized = []
    for item in items:
        equipment_id = item["equipment"].id if isinstance(item, dict) else item.equipment_id
        quantity = item["quantity"] if isinstance(item, dict) else item.quantity
        size = (item["size"] if isinstance(item, dict) else item.size) or ""
        price_per_day = item["price_per_day"] if isinstance(item, dict) else item.price_per_day
        subtotal = item["subtotal"] if isinstance(item, dict) else item.subtotal
        normalized.append((equipment_id, quantity, size, price_per_day, subtotal))
    return sorted(normalized)


@bookings_bp.route("", methods=["POST"])
@login_required
def create_booking():
    data = request.get_json() or {}

    required_fields = ["items", "start_date", "end_date", "payment_method"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"Поле '{field}' обязательно"}), 400

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
    user = g.user
    total_price = 0
    items_to_create = []

    for item_data in data["items"]:
        equipment_id = item_data.get("equipment_id")
        quantity     = max(1, int(item_data.get("quantity", 1)))
        size         = item_data.get("size")

        equipment = Equipment.query.get(equipment_id)
        if not equipment or not equipment.is_active:
            return jsonify({"error": f"Снаряжение #{equipment_id} не найдено"}), 404

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

    if data.get("with_insurance"):
        total_items = sum(i["quantity"] for i in items_to_create)
        insurance_cost = 1500 * days * total_items
        total_price += insurance_cost

    pending_cutoff = datetime.utcnow() - timedelta(hours=24)
    expected_signature = _normalize_booking_signature(items_to_create)
    existing_bookings = (
        Booking.query
        .filter(
            Booking.user_id == user.id,
            Booking.start_date == start_date,
            Booking.end_date == end_date,
            Booking.status == "pending",
            Booking.created_at >= pending_cutoff,
        )
        .all()
    )

    for existing_booking in existing_bookings:
        if existing_booking.total_price != total_price:
            continue
        if len(existing_booking.items) != len(items_to_create):
            continue
        if _normalize_booking_signature(existing_booking.items) != expected_signature:
            continue

        if data.get("notes") and existing_booking.notes != data.get("notes", ""):
            existing_booking.notes = data.get("notes", "")
        if data["payment_method"] and existing_booking.payment_method != data["payment_method"]:
            existing_booking.payment_method = data["payment_method"]

        db.session.commit()
        return jsonify(existing_booking.to_dict()), 200

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
    db.session.flush()

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

    if data["payment_method"] == "cash":
        booking.status = "confirmed"

    db.session.commit()
    if user.email:
        EmailService.send_booking_update(
            user.email,
            user.name or "",
            booking,
            booking.status,
        )
    return jsonify(booking.to_dict()), 201


@bookings_bp.route("/my", methods=["GET"])
@login_required
def my_bookings():
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
    booking = Booking.query.get_or_404(booking_id)

    if booking.user_id != g.user.id and g.user.role != "admin":
        return jsonify({"error": "Доступ запрещён"}), 403

    return jsonify(booking.to_dict()), 200


@bookings_bp.route("/<int:booking_id>", methods=["DELETE"])
@login_required
def cancel_booking(booking_id):
    booking = Booking.query.get_or_404(booking_id)

    if booking.user_id != g.user.id and g.user.role != "admin":
        return jsonify({"error": "Доступ запрещён"}), 403

    if booking.status not in ("pending", "confirmed"):
        return jsonify({
            "error": f"Нельзя отменить бронирование со статусом '{booking.status}'"
        }), 400

    booking.status = "cancelled"
    db.session.commit()
    if booking.user and booking.user.email:
        EmailService.send_booking_update(
            booking.user.email,
            booking.user.name or "",
            booking,
            "cancelled",
        )

    return jsonify({"message": "Бронирование успешно отменено"}), 200
