"""
app/routes/payments.py — Маршруты оплаты

Blueprint: payments_bp → префикс /api/payments

Маршруты:
    POST /api/payments/kaspi/init     — создать Kaspi QR
    POST /api/payments/card/init      — создать платёж картой
    GET  /api/payments/<id>/status    — проверить статус платежа
    POST /api/payments/kaspi/webhook  — вебхук от Kaspi (авто-подтверждение)
"""

from datetime import datetime
from flask import Blueprint, request, jsonify

from ..extensions import db
from ..models import Booking
from ..services.payment_service import PaymentService

payments_bp = Blueprint("payments", __name__)


@payments_bp.route("/kaspi/init", methods=["POST"])
def kaspi_init():
    """
    Создаёт Kaspi QR код для оплаты бронирования.

    Body: {
        "booking_id": 42,
        "name":  "Айдос Бекенов",
        "phone": "+77071234567"
    }

    Response: {
        "payment_id": "KASPI-A1B2C3D4",
        "qr_code":    "data:image/svg+xml;base64,...",
        "expires_at": "2025-02-01T12:30:00Z",
        "amount":     47000.0
    }
    """
    data       = request.get_json() or {}
    booking_id = data.get("booking_id")
    name       = data.get("name", "").strip()
    phone      = data.get("phone", "").strip()

    if not name or not phone:
        return jsonify({"error": "Поля 'name' и 'phone' обязательны"}), 400

    # Определяем сумму оплаты
    booking = None
    amount  = 0
    if booking_id and str(booking_id).isdigit():
        booking = Booking.query.get(int(booking_id))
        if booking:
            amount = booking.total_price

    # Создаём QR код через PaymentService
    result = PaymentService.create_kaspi_qr(booking_id, amount, name, phone)

    # Привязываем ID платежа к бронированию
    if booking:
        booking.kaspi_order_id = result["payment_id"]
        booking.payment_method = "kaspi"
        db.session.commit()

    return jsonify(result), 201


@payments_bp.route("/card/init", methods=["POST"])
def card_init():
    """
    Инициирует оплату картой через CloudPayments.

    Body: {
        "booking_id": 42,
        "name":  "Айдос Бекенов",
        "phone": "+77071234567"
    }

    Response: {
        "payment_id":  "CARD-A1B2C3D4",
        "payment_url": "https://checkout.cloudpayments.ru/?invoice=..."
    }
    """
    data       = request.get_json() or {}
    booking_id = data.get("booking_id")
    name       = data.get("name", "").strip()
    phone      = data.get("phone", "").strip()

    amount  = 0
    booking = None
    if booking_id and str(booking_id).isdigit():
        booking = Booking.query.get(int(booking_id))
        if booking:
            amount = booking.total_price

    result = PaymentService.create_card_payment(booking_id, amount, name, phone)

    if booking:
        booking.kaspi_order_id = result["payment_id"]
        booking.payment_method = "card"
        db.session.commit()

    return jsonify(result), 201


@payments_bp.route("/<string:payment_id>/status", methods=["GET"])
def payment_status(payment_id):
    """
    Проверяет статус платежа.

    Используется фронтендом для опроса (polling) каждые 3 секунды.
    Когда статус = "paid" → фронтенд перенаправляет на страницу успеха.

    Path params: payment_id — ID платежа (KASPI-XXXXXXXX)

    Response: {
        "status": "pending" | "paid" | "expired" | "failed",
        "paid_at": "2025-02-01T10:15:00" // только если paid
    }
    """
    booking = Booking.query.filter_by(kaspi_order_id=payment_id).first()

    if not booking:
        return jsonify({"status": "pending"}), 200

    if booking.status == "confirmed":
        return jsonify({"status": "paid", "paid_at": booking.confirmed_at}), 200

    if booking.status == "cancelled":
        return jsonify({"status": "expired"}), 200

    # Демо-режим: автоматически подтверждаем через 20 секунд
    # В продакшне подтверждение приходит через вебхук от Kaspi
    elapsed = (datetime.utcnow() - booking.created_at).total_seconds()
    if elapsed > 20:
        booking.status       = "confirmed"
        booking.confirmed_at = datetime.utcnow().isoformat()
        db.session.commit()
        return jsonify({"status": "paid", "paid_at": booking.confirmed_at}), 200

    return jsonify({"status": "pending"}), 200


@payments_bp.route("/kaspi/webhook", methods=["POST"])
def kaspi_webhook():
    """
    Вебхук от Kaspi — подтверждение успешной оплаты.

    Kaspi отправляет этот запрос когда пользователь оплатил QR код.
    Мы меняем статус бронирования на "confirmed".

    В продакшне ОБЯЗАТЕЛЬНО проверять подпись вебхука!

    Body (от Kaspi): {
        "OrderId": "KASPI-A1B2C3D4",
        "Status": "APPROVED",
        ...
    }
    """
    data     = request.get_json() or {}
    order_id = data.get("OrderId") or data.get("order_id")
    status   = data.get("Status") or data.get("status")

    if not order_id:
        return jsonify({"status": "ok"}), 200

    booking = Booking.query.filter_by(kaspi_order_id=order_id).first()
    if booking and status in ("APPROVED", "paid", "success"):
        booking.status       = "confirmed"
        booking.confirmed_at = datetime.utcnow().isoformat()
        db.session.commit()

    # Всегда возвращаем 200 OK, чтобы Kaspi не повторял запрос
    return jsonify({"status": "ok"}), 200
