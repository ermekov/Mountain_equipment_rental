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
from pathlib import Path
import csv
import io
import uuid

from flask import Blueprint, request, jsonify, Response
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from sqlalchemy import func, desc

from ..extensions import db
from ..models import User, Equipment, Booking, BookingItem
from ..utils.auth import admin_required, manager_required, make_token

admin_bp = Blueprint("admin", __name__)

EXPORT_I18N = {
    "ru": {
        "filename": "analytics",
        "types": {
            "summary": "summary",
            "products": "top-products",
            "users": "top-users",
        },
        "summary_headers": [
            "date_from",
            "date_to",
            "total_revenue",
            "total_bookings",
            "confirmed_bookings",
            "cancelled_bookings",
            "avg_booking_value",
            "active_users",
        ],
        "products_headers": ["equipment_id", "name", "rental_count", "revenue"],
        "users_headers": ["user_id", "name", "phone", "booking_count", "total_spent"],
    },
    "kk": {
        "filename": "analitika",
        "types": {
            "summary": "qysqasha-esep",
            "products": "top-tauarlar",
            "users": "top-klientter",
        },
        "summary_headers": [
            "bastalu_kuni",
            "ayaqtalu_kuni",
            "jalpy_tabys",
            "jalpy_bron_sany",
            "rastalgan_bron",
            "bas_tartylgan_bron",
            "ortasha_chek",
            "belsendi_klientter",
        ],
        "products_headers": ["tauar_id", "atauy", "jalga_alu_sany", "tabys"],
        "users_headers": ["user_id", "aty", "telefon", "bron_sany", "barlyq_shygyn"],
    },
    "en": {
        "filename": "analytics",
        "types": {
            "summary": "summary",
            "products": "top-products",
            "users": "top-users",
        },
        "summary_headers": [
            "date_from",
            "date_to",
            "total_revenue",
            "total_bookings",
            "confirmed_bookings",
            "cancelled_bookings",
            "average_order_value",
            "active_users",
        ],
        "products_headers": ["product_id", "name", "rental_count", "revenue"],
        "users_headers": ["user_id", "name", "phone", "booking_count", "total_spent"],
    },
}

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
UPLOADS_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "uploads" / "products"


def _parse_date_range():
    date_from_raw = request.args.get("date_from", "").strip()
    date_to_raw = request.args.get("date_to", "").strip()

    now = datetime.utcnow()
    start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    if date_from_raw:
        start_dt = datetime.strptime(date_from_raw, "%Y-%m-%d")
    if date_to_raw:
        end_dt = datetime.strptime(date_to_raw, "%Y-%m-%d").replace(
            hour=23, minute=59, second=59, microsecond=999999
        )

    return start_dt, end_dt


def _analytics_base_query(start_dt, end_dt):
    return Booking.query.filter(
        Booking.created_at >= start_dt,
        Booking.created_at <= end_dt,
    )


def _summary_payload(start_dt, end_dt):
    base_query = _analytics_base_query(start_dt, end_dt)
    paid_statuses = ["confirmed", "completed"]

    total_bookings = base_query.count()
    confirmed_bookings = base_query.filter(Booking.status.in_(paid_statuses)).count()
    cancelled_bookings = base_query.filter(Booking.status == "cancelled").count()
    total_revenue = (
        base_query.with_entities(func.sum(Booking.total_price))
        .filter(Booking.status.in_(paid_statuses))
        .scalar()
        or 0
    )
    active_users = (
        base_query.with_entities(func.count(func.distinct(Booking.user_id))).scalar() or 0
    )

    return {
        "date_from": start_dt.date().isoformat(),
        "date_to": end_dt.date().isoformat(),
        "total_revenue": int(total_revenue),
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed_bookings,
        "cancelled_bookings": cancelled_bookings,
        "avg_booking_value": round(total_revenue / confirmed_bookings, 2) if confirmed_bookings else 0,
        "active_users": active_users,
    }


def _top_products_payload(start_dt, end_dt, limit=10):
    rows = (
        db.session.query(
            Equipment.id.label("equipment_id"),
            Equipment.name_ru.label("name"),
            func.sum(BookingItem.quantity).label("rental_count"),
            func.sum(BookingItem.subtotal).label("revenue"),
        )
        .join(BookingItem, BookingItem.equipment_id == Equipment.id)
        .join(Booking, Booking.id == BookingItem.booking_id)
        .filter(
            Booking.created_at >= start_dt,
            Booking.created_at <= end_dt,
            Booking.status.in_(["confirmed", "completed"]),
        )
        .group_by(Equipment.id, Equipment.name_ru)
        .order_by(desc("rental_count"), desc("revenue"))
        .limit(limit)
        .all()
    )

    return [
        {
            "equipment_id": row.equipment_id,
            "name": row.name,
            "rental_count": int(row.rental_count or 0),
            "revenue": int(row.revenue or 0),
        }
        for row in rows
    ]


def _top_users_payload(start_dt, end_dt, limit=10):
    rows = (
        db.session.query(
            User.id.label("user_id"),
            User.name.label("name"),
            User.phone.label("phone"),
            func.count(Booking.id).label("booking_count"),
            func.sum(Booking.total_price).label("total_spent"),
        )
        .join(Booking, Booking.user_id == User.id)
        .filter(
            Booking.created_at >= start_dt,
            Booking.created_at <= end_dt,
            Booking.status.in_(["confirmed", "completed"]),
        )
        .group_by(User.id, User.name, User.phone)
        .order_by(desc("total_spent"), desc("booking_count"))
        .limit(limit)
        .all()
    )

    return [
        {
            "user_id": row.user_id,
            "name": row.name or "",
            "phone": row.phone or "",
            "booking_count": int(row.booking_count or 0),
            "total_spent": int(row.total_spent or 0),
        }
        for row in rows
    ]


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


@admin_bp.route("/analytics/summary", methods=["GET"])
@admin_required
def admin_analytics_summary():
    start_dt, end_dt = _parse_date_range()
    return jsonify(_summary_payload(start_dt, end_dt)), 200


@admin_bp.route("/analytics/top-products", methods=["GET"])
@admin_required
def admin_analytics_top_products():
    start_dt, end_dt = _parse_date_range()
    limit = min(int(request.args.get("limit", 10) or 10), 50)
    return jsonify(_top_products_payload(start_dt, end_dt, limit)), 200


@admin_bp.route("/analytics/top-users", methods=["GET"])
@admin_required
def admin_analytics_top_users():
    start_dt, end_dt = _parse_date_range()
    limit = min(int(request.args.get("limit", 10) or 10), 50)
    return jsonify(_top_users_payload(start_dt, end_dt, limit)), 200


@admin_bp.route("/analytics/export", methods=["GET"])
@admin_required
def admin_analytics_export():
    start_dt, end_dt = _parse_date_range()
    export_type = request.args.get("type", "summary").strip()
    locale = request.args.get("locale", "ru").strip().lower()
    export_locale = EXPORT_I18N.get(locale, EXPORT_I18N["ru"])

    output = io.StringIO()
    writer = csv.writer(output)

    if export_type == "products":
        rows = _top_products_payload(start_dt, end_dt, limit=100)
        writer.writerow(export_locale["products_headers"])
        for row in rows:
            writer.writerow([row["equipment_id"], row["name"], row["rental_count"], row["revenue"]])
    elif export_type == "users":
        rows = _top_users_payload(start_dt, end_dt, limit=100)
        writer.writerow(export_locale["users_headers"])
        for row in rows:
            writer.writerow([row["user_id"], row["name"], row["phone"], row["booking_count"], row["total_spent"]])
    else:
        row = _summary_payload(start_dt, end_dt)
        writer.writerow(export_locale["summary_headers"])
        writer.writerow([
            row["date_from"],
            row["date_to"],
            row["total_revenue"],
            row["total_bookings"],
            row["confirmed_bookings"],
            row["cancelled_bookings"],
            row["avg_booking_value"],
            row["active_users"],
        ])

    export_type_label = export_locale["types"].get(export_type, export_type)
    filename = f'{export_locale["filename"]}-{export_type_label}-{start_dt.date().isoformat()}-{end_dt.date().isoformat()}.csv'
    return Response(
        "\ufeff" + output.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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


@admin_bp.route("/upload-image", methods=["POST"])
@admin_required
def admin_upload_image():
    """
    Загружает изображение товара в локальную папку frontend/public/uploads/products.

    FormData:
        file=<image>
    """
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "Файл не передан"}), 400

    original_name = secure_filename(file.filename)
    extension = Path(original_name).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({"error": "Допустимы только JPG, PNG, WEBP и GIF"}), 400

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    target_path = UPLOADS_DIR / filename
    file.save(target_path)

    return jsonify({
        "image_url": f"/uploads/products/{filename}",
        "filename": filename,
    }), 201


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
