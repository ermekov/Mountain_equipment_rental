"""
app/routes/admin.py — Административные и менеджерские маршруты

Blueprint: admin_bp → префикс /api/admin

Роли и доступ:
    admin   → все маршруты
    manager → только маршруты с @manager_required (заказы, клиенты)

Маршруты:
    POST  /api/admin/login               — вход admin/manager (email+пароль)
    GET   /api/admin/stats               — статистика [admin]
    GET   /api/admin/bookings            — все бронирования [manager+admin]
    PATCH /api/admin/bookings/<id>       — изменить статус [manager+admin]
    GET   /api/admin/bookings/<id>       — детали брони [manager+admin]
    GET   /api/admin/users               — список клиентов [manager+admin]
    GET   /api/admin/products            — список снаряжения [manager+admin]
    POST  /api/admin/products            — добавить [admin only]
    PUT   /api/admin/products/<id>       — обновить [admin only]
    DELETE /api/admin/products/<id>      — удалить [admin only]
"""

from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import func

from ..extensions import db
from ..models import User, Equipment, Booking, BookingItem
from ..utils.auth import admin_required, manager_required, make_token

admin_bp = Blueprint("admin", __name__)


# ─────────────────────────────────────────────────────────
# ВХОД (для admin и manager — оба входят через email+пароль)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/login", methods=["POST"])
def admin_login():
    """
    Единая точка входа для admin и manager.

    Body:    { "email": "manager@peakrent.kz", "password": "manager123" }
    Response: { "token": "eyJ...", "user": { "role": "manager", ... } }

    Роль возвращается в токене — фронтенд решает какой интерфейс показать:
        role == "admin"   → /ru/admin
        role == "manager" → /ru/manager
    """
    data     = request.get_json() or {}
    email    = data.get("email", "").strip()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email и пароль обязательны"}), 400

    # Ищем пользователя с ролью admin или manager
    user = User.query.filter(
        User.email == email,
        User.role.in_(["admin", "manager"])
    ).first()

    if not user or not user.password:
        return jsonify({"error": "Пользователь не найден"}), 401

    if not check_password_hash(user.password, password):
        return jsonify({"error": "Неверный пароль"}), 401

    token = make_token(user.id, user.role)
    return jsonify({"token": token, "user": user.to_dict()}), 200


# ─────────────────────────────────────────────────────────
# СТАТИСТИКА (только admin)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def admin_stats():
    """Статистика дашборда: выручка, брони, пользователи. Только для admin."""
    now         = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month  = (month_start - timedelta(days=1)).replace(day=1)

    revenue_month = db.session.query(func.sum(Booking.total_price)).filter(
        Booking.created_at >= month_start, Booking.status == "confirmed"
    ).scalar() or 0

    revenue_prev = db.session.query(func.sum(Booking.total_price)).filter(
        Booking.created_at >= prev_month,
        Booking.created_at < month_start,
        Booking.status == "confirmed",
    ).scalar() or 1

    users = User.query.order_by(User.created_at.desc()).limit(50).all()
    users_data = []
    for u in users:
        d = u.to_dict()
        d["booking_count"] = Booking.query.filter_by(user_id=u.id).count()
        d["total_spent"]   = db.session.query(func.sum(Booking.total_price)).filter_by(
            user_id=u.id, status="confirmed"
        ).scalar() or 0
        users_data.append(d)

    return jsonify({
        "revenue_month":   revenue_month,
        "revenue_growth":  round((revenue_month - revenue_prev) / revenue_prev * 100),
        "bookings_month":  Booking.query.filter(Booking.created_at >= month_start).count(),
        "bookings_active": Booking.query.filter(
            Booking.status.in_(["confirmed", "pending"])
        ).count(),
        "equipment_count": Equipment.query.filter_by(is_active=True).count(),
        "users_count":     User.query.count(),
        "users_new":       User.query.filter(User.created_at >= month_start).count(),
        "users":           users_data,
    }), 200


# ─────────────────────────────────────────────────────────
# УПРАВЛЕНИЕ БРОНИРОВАНИЯМИ (manager + admin)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/bookings", methods=["GET"])
@manager_required
def admin_bookings():
    """
    Список всех бронирований.
    Менеджер работает с ними: подтверждает, завершает, отменяет.

    Query params:
        status — фильтр: pending | confirmed | completed | cancelled
        search — поиск по номеру телефона клиента
    """
    query  = Booking.query.order_by(Booking.created_at.desc())
    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    if status:
        query = query.filter(Booking.status == status)

    # Поиск по телефону клиента
    if search:
        query = query.join(User).filter(User.phone.ilike(f"%{search}%"))

    bookings = query.limit(300).all()
    return jsonify([b.to_dict() for b in bookings]), 200


@admin_bp.route("/bookings/<int:booking_id>", methods=["GET"])
@manager_required
def admin_get_booking(booking_id):
    """Детали конкретного бронирования (для менеджера)."""
    booking = Booking.query.get_or_404(booking_id)
    return jsonify(booking.to_dict()), 200


@admin_bp.route("/bookings/<int:booking_id>", methods=["PATCH"])
@manager_required
def admin_update_booking(booking_id):
    """
    Изменить статус или добавить комментарий к бронированию.
    Это основная операция менеджера.

    Body: {
        "status": "confirmed",   // pending|confirmed|completed|cancelled
        "notes": "Клиент позвонил, подтвердил получение"
    }
    """
    booking = Booking.query.get_or_404(booking_id)
    data    = request.get_json() or {}

    allowed_statuses = ("pending", "confirmed", "completed", "cancelled")
    new_status = data.get("status")

    if new_status and new_status not in allowed_statuses:
        return jsonify({"error": f"Недопустимый статус. Допустимые: {allowed_statuses}"}), 400

    if new_status:
        booking.status = new_status
        # При подтверждении — сохраняем время
        if new_status == "confirmed" and not booking.confirmed_at:
            booking.confirmed_at = datetime.utcnow().isoformat()

    # Менеджер может оставить заметку
    if "notes" in data:
        booking.notes = data["notes"]

    db.session.commit()
    return jsonify(booking.to_dict()), 200


# ─────────────────────────────────────────────────────────
# КЛИЕНТЫ (manager + admin — только просмотр)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@manager_required
def admin_users():
    """
    Список клиентов. Менеджер видит их для работы с заказами.
    Менеджер НЕ может изменять пользователей — только admin.
    """
    # Показываем только обычных пользователей (не admin/manager)
    users = User.query.filter(
        User.role == "user"
    ).order_by(User.created_at.desc()).all()

    # Добавляем статистику по каждому клиенту
    result = []
    for u in users:
        d = u.to_dict()
        d["booking_count"] = Booking.query.filter_by(user_id=u.id).count()
        d["active_bookings"] = Booking.query.filter_by(
            user_id=u.id, status="confirmed"
        ).count()
        result.append(d)

    return jsonify(result), 200


# ─────────────────────────────────────────────────────────
# СНАРЯЖЕНИЕ — ПРОСМОТР (manager + admin)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/products", methods=["GET"])
@manager_required
def admin_list_products():
    """
    Список снаряжения. Менеджер видит наличие для работы с клиентами.
    Изменять снаряжение может только admin.
    """
    items = Equipment.query.order_by(Equipment.id).all()
    return jsonify([i.to_dict() for i in items]), 200


# ─────────────────────────────────────────────────────────
# СНАРЯЖЕНИЕ — CRUD (только admin)
# ─────────────────────────────────────────────────────────

@admin_bp.route("/products", methods=["POST"])
@admin_required
def admin_create_product():
    """
    Добавить снаряжение. Только admin.

    Body: { "name": "Шлем", "description": "...", "price": 5000,
            "stock": 10, "image_url": "https://..." }
    """
    import json
    data = request.get_json() or {}

    if not data.get("name") or not data.get("price"):
        return jsonify({"error": "Поля 'name' и 'price' обязательны"}), 400

    item = Equipment(
        slug=data["name"].lower().replace(" ", "-") + f"-{int(datetime.utcnow().timestamp())}",
        name_ru=data["name"],
        name_kk=data.get("name_kk", data["name"]),
        name_en=data.get("name_en", data["name"]),
        description_ru=data.get("description", ""),
        description_kk=data.get("description", ""),
        description_en=data.get("description", ""),
        price_per_day=float(data["price"]),
        deposit_amount=float(data.get("deposit", 0)),
        stock=int(data.get("stock", 1)),
        images=json.dumps([data["image_url"]]) if data.get("image_url") else "[]",
        is_active=True,
        is_featured=data.get("is_featured", False),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@admin_bp.route("/products/<int:product_id>", methods=["PUT"])
@admin_required
def admin_update_product(product_id):
    """Обновить снаряжение. Только admin."""
    import json
    item = Equipment.query.get_or_404(product_id)
    data = request.get_json() or {}

    if "name"        in data: item.name_ru        = data["name"]
    if "description" in data: item.description_ru  = data["description"]
    if "price"       in data: item.price_per_day   = float(data["price"])
    if "stock"       in data: item.stock            = int(data["stock"])
    if "is_active"   in data: item.is_active        = bool(data["is_active"])
    if "is_featured" in data: item.is_featured      = bool(data["is_featured"])
    if "image_url"   in data: item.images           = json.dumps([data["image_url"]])

    db.session.commit()
    return jsonify(item.to_dict()), 200


@admin_bp.route("/products/<int:product_id>", methods=["DELETE"])
@admin_required
def admin_delete_product(product_id):
    """Скрыть снаряжение. Только admin."""
    item = Equipment.query.get_or_404(product_id)
    item.is_active = False
    db.session.commit()
    return jsonify({"message": f"'{item.name_ru}' скрыто из каталога"}), 200
