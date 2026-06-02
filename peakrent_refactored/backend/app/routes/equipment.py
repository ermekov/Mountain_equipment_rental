from datetime import date
from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import Equipment, Category, Favorite
from ..utils.auth import admin_required, login_required

equipment_bp = Blueprint("equipment", __name__)


@equipment_bp.route("/categories", methods=["GET"])
def get_categories():
    categories = Category.query.order_by(Category.sort_order).all()
    return jsonify([c.to_dict() for c in categories]), 200


@equipment_bp.route("/featured", methods=["GET"])
def get_featured():
    limit = request.args.get("limit", 6, type=int)
    items = (
        Equipment.query
        .filter_by(is_active=True, is_featured=True)
        .limit(limit)
        .all()
    )
    return jsonify([i.to_dict() for i in items]), 200


@equipment_bp.route("/favorites", methods=["GET"])
@login_required
def get_favorites():
    items = (
        Equipment.query
        .join(Favorite, Favorite.equipment_id == Equipment.id)
        .filter(Favorite.user_id == g.user.id, Equipment.is_active.is_(True))
        .order_by(Favorite.created_at.desc())
        .all()
    )
    return jsonify([item.to_dict() for item in items]), 200


@equipment_bp.route("/<int:eq_id>/favorite", methods=["POST"])
@login_required
def add_favorite(eq_id):
    item = Equipment.query.filter_by(id=eq_id, is_active=True).first()
    if not item:
        return jsonify({"error": "Снаряжение не найдено"}), 404

    existing = Favorite.query.filter_by(user_id=g.user.id, equipment_id=eq_id).first()
    if existing:
        return jsonify({"message": "Already in favorites"}), 200

    db.session.add(Favorite(user_id=g.user.id, equipment_id=eq_id))
    db.session.commit()
    return jsonify({"message": "Added to favorites"}), 201


@equipment_bp.route("/<int:eq_id>/favorite", methods=["DELETE"])
@login_required
def remove_favorite(eq_id):
    favorite = Favorite.query.filter_by(user_id=g.user.id, equipment_id=eq_id).first()
    if not favorite:
        return jsonify({"message": "Favorite not found"}), 200

    db.session.delete(favorite)
    db.session.commit()
    return jsonify({"message": "Removed from favorites"}), 200


@equipment_bp.route("", methods=["GET"])
def get_equipment_list():
    query = Equipment.query.filter_by(is_active=True)

    category_slug = request.args.get("category")
    if category_slug:
        category = Category.query.filter_by(slug=category_slug).first()
        if category:
            query = query.filter(Equipment.category_id == category.id)

    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            Equipment.name_ru.ilike(like) |
            Equipment.name_kk.ilike(like) |
            Equipment.name_en.ilike(like)
        )

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

    sort = request.args.get("sort", "default")
    if sort == "price_asc":
        query = query.order_by(Equipment.price_per_day.asc())
    elif sort == "price_desc":
        query = query.order_by(Equipment.price_per_day.desc())
    else:
        query = query.order_by(Equipment.is_featured.desc(), Equipment.id)

    limit = request.args.get("limit", 60, type=int)
    items = query.limit(limit).all()

    start_d = end_d = None
    try:
        start_str = request.args.get("start_date")
        end_str   = request.args.get("end_date")
        if start_str:
            start_d = date.fromisoformat(start_str)
        if end_str:
            end_d = date.fromisoformat(end_str)
    except ValueError:
        pass

    return jsonify([i.to_dict(start_d, end_d) for i in items]), 200


@equipment_bp.route("/<slug>", methods=["GET"])
def get_equipment_one(slug):
    item = Equipment.query.filter_by(slug=slug, is_active=True).first()
    if not item:
        return jsonify({"error": f"Снаряжение '{slug}' не найдено"}), 404
    return jsonify(item.to_dict()), 200


@equipment_bp.route("/availability", methods=["POST"])
def check_availability():
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
    item = Equipment.query.get_or_404(eq_id)
    data = request.get_json() or {}

    protected_fields = {"id", "created_at", "category"}
    for field, value in data.items():
        if hasattr(item, field) and field not in protected_fields:
            setattr(item, field, value)

    db.session.commit()
    return jsonify(item.to_dict()), 200


@equipment_bp.route("/<int:eq_id>", methods=["DELETE"])
@admin_required
def delete_equipment(eq_id):
    item = Equipment.query.get_or_404(eq_id)
    item.is_active = False
    db.session.commit()
    return jsonify({"message": f"Снаряжение '{item.name_ru}' скрыто из каталога"}), 200
