from datetime import datetime

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Booking
from ..services.payment_service import PaymentService

payments_bp = Blueprint("payments", __name__)


def _normalize_booking_ids(payload):
    booking_ids = payload.get("booking_ids") or []
    booking_id = payload.get("booking_id")

    normalized = []

    if booking_id and str(booking_id).isdigit():
        normalized.append(int(booking_id))

    for value in booking_ids:
        if str(value).isdigit():
            normalized.append(int(value))

    seen = set()
    unique_ids = []
    for value in normalized:
        if value not in seen:
            seen.add(value)
            unique_ids.append(value)

    return unique_ids


def _load_bookings(payload):
    booking_ids = _normalize_booking_ids(payload)
    bookings = []

    if booking_ids:
        bookings = Booking.query.filter(Booking.id.in_(booking_ids)).all()
        bookings.sort(key=lambda booking: booking_ids.index(booking.id))

    return bookings


def _attach_payment_to_bookings(bookings, payment_id, method):
    for booking in bookings:
        booking.kaspi_order_id = payment_id
        booking.payment_method = method
    db.session.commit()


def _mark_bookings_paid(bookings):
    paid_at = datetime.utcnow().isoformat()

    for booking in bookings:
        if not booking.confirmed_at:
            booking.confirmed_at = paid_at

    db.session.commit()
    return paid_at


@payments_bp.route("/kaspi/init", methods=["POST"])
def kaspi_init():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()

    if not name or not phone:
        return jsonify({"error": "Fields 'name' and 'phone' are required"}), 400

    bookings = _load_bookings(data)
    amount = sum(booking.total_price for booking in bookings)

    if not bookings:
        return jsonify({"error": "Booking not found"}), 404

    result = PaymentService.create_kaspi_qr(bookings[0].id, amount, name, phone)
    _attach_payment_to_bookings(bookings, result["payment_id"], "kaspi")

    return jsonify(result), 201


@payments_bp.route("/card/init", methods=["POST"])
def card_init():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    bookings = _load_bookings(data)

    if not bookings:
        return jsonify({"error": "Booking not found"}), 404

    amount = sum(booking.total_price for booking in bookings)
    result = PaymentService.create_card_payment(bookings[0].id, amount, name, phone)
    _attach_payment_to_bookings(bookings, result["payment_id"], "card")

    return jsonify(result), 201


@payments_bp.route("/<string:payment_id>/status", methods=["GET"])
def payment_status(payment_id):
    bookings = Booking.query.filter_by(kaspi_order_id=payment_id).all()

    if not bookings:
        return jsonify({"status": "pending"}), 200

    if all(booking.status == "cancelled" for booking in bookings):
        return jsonify({"status": "expired"}), 200

    if all(booking.confirmed_at or booking.status in ("confirmed", "completed") for booking in bookings):
        paid_at = next((booking.confirmed_at for booking in bookings if booking.confirmed_at), None)
        return jsonify({"status": "paid", "paid_at": paid_at}), 200

    if all(booking.status == "confirmed" for booking in bookings):
        paid_at = next((booking.confirmed_at for booking in bookings if booking.confirmed_at), None)
        return jsonify({"status": "paid", "paid_at": paid_at}), 200

    return jsonify({"status": "pending"}), 200


@payments_bp.route("/<string:payment_id>/simulate", methods=["POST"])
def simulate_payment(payment_id):
    """
    Demo-only helper:
    Явно отмечает оплату, но оставляет бронь в pending до подтверждения менеджером.
    """
    bookings = Booking.query.filter_by(kaspi_order_id=payment_id).all()

    if not bookings:
        return jsonify({"error": "Payment not found"}), 404

    paid_at = _mark_bookings_paid(bookings)

    return jsonify({"status": "paid", "paid_at": paid_at}), 200


@payments_bp.route("/kaspi/webhook", methods=["POST"])
def kaspi_webhook():
    data = request.get_json() or {}
    order_id = data.get("OrderId") or data.get("order_id")
    status = data.get("Status") or data.get("status")

    if not order_id:
        return jsonify({"status": "ok"}), 200

    bookings = Booking.query.filter_by(kaspi_order_id=order_id).all()
    if bookings and status in ("APPROVED", "paid", "success"):
        _mark_bookings_paid(bookings)

    return jsonify({"status": "ok"}), 200
