"""
app/services/email_service.py — Сервис отправки email
"""

import smtplib
from email.message import EmailMessage

from flask import current_app


class EmailService:
    """Сервис отправки email-сообщений с OTP кодом."""

    @classmethod
    def _send_email(cls, recipient: str, subject: str, body: str) -> bool:
        if current_app.config.get("DEV_MODE", True):
            current_app.logger.info(f"[DEV] Email to {recipient}: {subject}")
            return True

        host = current_app.config.get("SMTP_HOST", "")
        port = int(current_app.config.get("SMTP_PORT", 587))
        username = current_app.config.get("SMTP_USERNAME", "")
        password = current_app.config.get("SMTP_PASSWORD", "")
        sender = current_app.config.get("SMTP_FROM_EMAIL", username)
        use_tls = current_app.config.get("SMTP_USE_TLS", True)

        if not host or not sender:
            current_app.logger.warning("SMTP settings are not configured")
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = sender
        message["To"] = recipient
        message.set_content(body)

        try:
            with smtplib.SMTP(host, port, timeout=10) as server:
                if use_tls:
                    server.starttls()
                if username and password:
                    server.login(username, password)
                server.send_message(message)
            return True
        except Exception as exc:  # pragma: no cover
            current_app.logger.error(f"Email sending error: {exc}")
            return False

    @classmethod
    def send_otp(cls, email: str, code: str) -> bool:
        subject = "PeakRent — Email verification code"
        body = (
            "PeakRent\n"
            "----------------------------------------\n"
            f"Your verification code: {code}\n\n"
            "Use this 6-digit code to complete your registration.\n"
            "The code is valid for 10 minutes.\n\n"
            "If you did not request this code, you can ignore this email.\n\n"
            "PeakRent Team"
        )
        return cls._send_email(email, subject, body)

    @classmethod
    def send_booking_update(cls, email: str, customer_name: str, booking, status: str, note: str = "") -> bool:
        equipment_lines = []
        for item in booking.items:
            equipment_name = (
                getattr(getattr(item, "equipment", None), "name_ru", None)
                or getattr(item, "equipment_name", None)
                or "Equipment"
            )
            quantity = getattr(item, "quantity", None)
            size = getattr(item, "size", None)

            line = f"- {equipment_name}"
            if quantity:
                line += f" x{quantity}"
            if size:
                line += f" (size: {size})"
            equipment_lines.append(line)
        equipment_block = "\n".join(equipment_lines) if equipment_lines else "- Equipment list unavailable"

        status_meta = {
            "pending": (
                "PeakRent — Booking received",
                "Your booking has been created and is waiting for confirmation.",
            ),
            "confirmed": (
                "PeakRent — Booking confirmed",
                "Great news! Your booking has been confirmed and is ready for the next step.",
            ),
            "cancelled": (
                "PeakRent — Booking cancelled",
                "Your booking has been cancelled. If this was unexpected, just reply to this email.",
            ),
            "completed": (
                "PeakRent — Booking completed",
                "Thank you for using PeakRent. Your rental has been marked as completed.",
            ),
        }
        subject, headline = status_meta.get(
            status,
            ("PeakRent — Booking update", "There is an update for your booking."),
        )

        note_block = f"\nManager note: {note}\n" if note else ""
        body = (
            f"Hello, {customer_name or 'PeakRent client'}!\n\n"
            f"{headline}\n\n"
            f"Booking number: {booking.booking_number}\n"
            f"Rental dates: {booking.start_date} — {booking.end_date}\n"
            f"Total amount: {booking.total_price} ₸\n"
            f"Payment method: {booking.payment_method or 'not specified'}\n\n"
            f"Items:\n{equipment_block}\n"
            f"{note_block}\n"
            "If you have any questions, reply to this email or contact PeakRent support.\n\n"
            "Thank you for choosing PeakRent!\n"
            "PeakRent Team"
        )
        return cls._send_email(email, subject, body)
