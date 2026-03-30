"""
app/routes/reviews.py — Маршруты отзывов

Blueprint: reviews_bp → префикс /api/reviews

Маршруты:
    GET  /api/reviews/<equipment_id>  — список отзывов о снаряжении
    POST /api/reviews                 — оставить отзыв
"""

from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import Review
from ..utils.auth import login_required

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/<int:equipment_id>", methods=["GET"])
def get_reviews(equipment_id):
    """
    Возвращает список отзывов для конкретного снаряжения.

    Path params: equipment_id — ID снаряжения
    """
    reviews = (
        Review.query
        .filter_by(equipment_id=equipment_id)
        .order_by(Review.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify([r.to_dict() for r in reviews]), 200


@reviews_bp.route("", methods=["POST"])
@login_required
def create_review():
    """
    Создаёт новый отзыв о снаряжении.

    Требует авторизации.

    Body: {
        "equipment_id": 1,
        "rating":       5,           // от 1 до 5
        "comment":      "Отличные лыжи!",
        "booking_id":   42           // необязательно
    }
    """
    data         = request.get_json() or {}
    equipment_id = data.get("equipment_id")
    rating       = data.get("rating", 5)
    comment      = data.get("comment", "").strip()

    if not equipment_id:
        return jsonify({"error": "Поле 'equipment_id' обязательно"}), 400

    if not isinstance(rating, int) or not (1 <= rating <= 5):
        return jsonify({"error": "Рейтинг должен быть числом от 1 до 5"}), 400

    review = Review(
        user_id=g.user.id,
        equipment_id=equipment_id,
        booking_id=data.get("booking_id"),
        rating=rating,
        comment=comment,
    )
    db.session.add(review)
    db.session.commit()

    return jsonify(review.to_dict()), 201
