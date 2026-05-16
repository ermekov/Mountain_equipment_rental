"""
app/routes/equipment.py — Маршруты снаряжения

Blueprint: equipment_bp → префикс /api/equipment

Маршруты:
    GET  /api/equipment/categories   — список категорий
    GET  /api/equipment/featured     — популярные позиции (для главной)
    GET  /api/equipment              — каталог с фильтрами
    GET  /api/equipment/<slug>       — карточка снаряжения
    POST /api/equipment/availability — проверить наличие на даты
    PUT  /api/equipment/<id>         — обновить снаряжение [admin]
    DEL  /api/equipment/<id>         — удалить (скрыть) снаряжение [admin]
"""

from datetime import date
from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import Equipment, Category
from ..utils.auth import admin_required

equipment_bp = Blueprint("equipment", __name__)


@equipment_bp.route("/categories", methods=["GET"])
def get_categories():
    """Возвращает список всех категорий снаряжения."""
    categories = Category.query.order_by(Category.sort_order).all()
    return jsonify([c.to_dict() for c in categories]), 200


@equipment_bp.route("/featured", methods=["GET"])
def get_featured():
    """
    Возвращает рекомендуемые позиции для главной страницы.

    Query params:
        limit — количество (по умолчанию 6)
    """
    limit = request.args.get("limit", 6, type=int)
    items = (
        Equipment.query
        .filter_by(is_active=True, is_featured=True)
        .limit(limit)
        .all()
    )
    return jsonify([i.to_dict() for i in items]), 200


@equipment_bp.route("", methods=["GET"])
def get_equipment_list():
    """
    Возвращает каталог снаряжения с поддержкой фильтрации.

    Query params:
        category   — slug категории (skiing, hiking, etc.)
        search     — поиск по названию
        min_price  — минимальная цена в день
        max_price  — максимальная цена в день
        start_date — начало аренды (YYYY-MM-DD)
        end_date   — конец аренды (YYYY-MM-DD)
        sort       — сортировка: default | price_asc | price_desc | rating
        limit      — количество результатов (по умолчанию 60)
    """
    query = Equipment.query.filter_by(is_active=True)

    # Фильтр по категории
    category_slug = request.args.get("category")
    if category_slug:
        category = Category.query.filter_by(slug=category_slug).first()
        if category:
            query = query.filter(Equipment.category_id == category.id)

    # Поиск по названию (в трёх языках)
    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            Equipment.name_ru.ilike(like) |
            Equipment.name_kk.ilike(like) |
            Equipment.name_en.ilike(like)
        )

    # Фильтр по цене
    min_price = request.args.get("min_price", type=int)
    max_price = request.args.get("max_price", type=int)
    if min_price is not None:
        query = query.filter(Equipment.price_per_day >= min_price)
    if max_price is not None:
        query = query.filter(Equipment.price_per_day <= max_price)

    gender = (request.args.get("gender") or "").strip().lower()
    if gender == "male":
        query = query.filter(Equipment.gender.in_(["male", "unisex"]))
    elif gender == "female":
        query = query.filter(Equipment.gender.in_(["female", "unisex"]))
    elif gender == "unisex":
        query = query.filter(Equipment.gender == "unisex")

    # Сортировка
    sort = request.args.get("sort", "default")
    if sort == "price_asc":
        query = query.order_by(Equipment.price_per_day.asc())
    elif sort == "price_desc":
        query = query.order_by(Equipment.price_per_day.desc())
    else:
        # По умолчанию: рекомендованные вперёд
        query = query.order_by(Equipment.is_featured.desc(), Equipment.id)

    limit = request.args.get("limit", 60, type=int)
    items = query.limit(limit).all()

    # Разбираем даты для расчёта доступности
    start_d = end_d = None
    try:
        start_str = request.args.get("start_date")
        end_str   = request.args.get("end_date")
        if start_str:
            start_d = date.fromisoformat(start_str)
        if end_str:
            end_d = date.fromisoformat(end_str)
    except ValueError:
        pass  # Невалидные даты игнорируем

    return jsonify([i.to_dict(start_d, end_d) for i in items]), 200


@equipment_bp.route("/<slug>", methods=["GET"])
def get_equipment_one(slug):
    """
    Возвращает детальную информацию о единице снаряжения.

    Path params:
        slug — URL-идентификатор снаряжения (например: "alpine-ski-set")
    """
    item = Equipment.query.filter_by(slug=slug, is_active=True).first()
    if not item:
        return jsonify({"error": f"Снаряжение '{slug}' не найдено"}), 404
    return jsonify(item.to_dict()), 200


@equipment_bp.route("/availability", methods=["POST"])
def check_availability():
    """
    Проверяет доступное количество снаряжения на заданные даты.

    Body: {
        "ids": [1, 2, 3],
        "start_date": "2025-02-01",
        "end_date": "2025-02-03"
    }
    Response: { "1": 5, "2": 0, "3": 3 }  — доступное количество
    """
    data       = request.get_json() or {}
    ids        = data.get("ids", [])
    start_str  = data.get("start_date")
    end_str    = data.get("end_date")

    if not start_str or not end_str:
        return jsonify({"error": "start_date и end_date обязательны"}), 400

    try:
        start_d = date.fromisoformat(start_str)
        end_d   = date.fromisoformat(end_str)
    except ValueError:
        return jsonify({"error": "Неверный формат даты. Используйте YYYY-MM-DD"}), 400

    result = {}
    for eq_id in ids:
        item = Equipment.query.get(eq_id)
        result[str(eq_id)] = item.available_stock(start_d, end_d) if item else 0

    return jsonify(result), 200


@equipment_bp.route("/<int:eq_id>", methods=["PUT"])
@admin_required
def update_equipment(eq_id):
    """
    Обновляет данные снаряжения. Только для администраторов.

    Path params: eq_id — ID снаряжения
    Body: поля для обновления (name_ru, price_per_day, stock, etc.)
    """
    item = Equipment.query.get_or_404(eq_id)
    data = request.get_json() or {}

    # Обновляем только переданные поля (частичное обновление)
    protected_fields = {"id", "created_at", "category"}
    for field, value in data.items():
        if hasattr(item, field) and field not in protected_fields:
            setattr(item, field, value)

    db.session.commit()
    return jsonify(item.to_dict()), 200


@equipment_bp.route("/<int:eq_id>", methods=["DELETE"])
@admin_required
def delete_equipment(eq_id):
    """
    Скрывает снаряжение из каталога (soft delete). Только для администраторов.

    Мы не удаляем физически, а устанавливаем is_active=False.
    Это сохраняет историю бронирований.
    """
    item = Equipment.query.get_or_404(eq_id)
    item.is_active = False
    db.session.commit()
    return jsonify({"message": f"Снаряжение '{item.name_ru}' скрыто из каталога"}), 200
