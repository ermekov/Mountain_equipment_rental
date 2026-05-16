"""
app/routes/reviews.py - review routes
"""

from flask import Blueprint, request, jsonify, g

from ..extensions import db
from ..models import Review, Booking, BookingItem
from ..utils.auth import login_required

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/<int:equipment_id>", methods=["GET"])
def get_reviews(equipment_id):
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
    data = request.get_json() or {}
    equipment_id = data.get("equipment_id")
    rating = data.get("rating", 5)
    comment = data.get("comment", "").strip()

    if not equipment_id:
        return jsonify({"error": "Field 'equipment_id' is required"}), 400

    if not isinstance(rating, int) or not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be an integer from 1 to 5"}), 400

    existing_review = Review.query.filter_by(
        user_id=g.user.id,
        equipment_id=equipment_id,
    ).first()
    if existing_review:
        return jsonify({"error": "You have already reviewed this equipment"}), 409

    eligible_booking = (
        Booking.query
        .join(BookingItem, BookingItem.booking_id == Booking.id)
        .filter(
            Booking.user_id == g.user.id,
            BookingItem.equipment_id == equipment_id,
            Booking.status.in_(["confirmed", "completed"]),
        )
        .order_by(Booking.created_at.desc())
        .first()
    )
    if not eligible_booking:
        return jsonify({
            "error": "Only customers who booked this equipment can leave a review"
        }), 403

    review = Review(
        user_id=g.user.id,
        equipment_id=equipment_id,
        booking_id=eligible_booking.id,
        rating=rating,
        comment=comment,
    )
    db.session.add(review)
    db.session.commit()

    return jsonify(review.to_dict()), 201
