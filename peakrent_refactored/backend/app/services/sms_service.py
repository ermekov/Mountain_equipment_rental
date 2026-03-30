"""
app/services/sms_service.py — Сервис отправки SMS

Используется для:
    1. Отправки OTP кодов при входе
    2. Подтверждения бронирования
    3. Напоминания о возврате снаряжения

Провайдер: smsapi.kz — казахстанский SMS шлюз.
В режиме разработки (DEV_MODE=True) SMS не отправляются,
код всегда = "123456".
"""

import random
import string
import requests
from flask import current_app


class SMSService:
    """Сервис отправки SMS сообщений."""

    SMS_API_URL = "https://api.smsapi.kz/sms/send"

    @classmethod
    def generate_otp(cls) -> str:
        """
        Генерирует случайный 6-значный OTP код.

        В dev-режиме возвращает "123456" для удобства тестирования.

        Returns:
            str: 6-значный числовой код
        """
        if current_app.config.get("DEV_MODE", True):
            return current_app.config.get("DEV_OTP", "123456")

        return "".join(random.choices(string.digits, k=6))

    @classmethod
    def send_otp(cls, phone: str, code: str) -> bool:
        """
        Отправляет OTP код на указанный номер телефона.

        Args:
            phone: номер телефона в формате +77XXXXXXXXX
            code:  6-значный OTP код

        Returns:
            bool: True если отправка успешна
        """
        # В dev-режиме не отправляем реальный SMS
        if current_app.config.get("DEV_MODE", True):
            current_app.logger.info(f"[DEV] OTP для {phone}: {code}")
            return True

        token  = current_app.config.get("SMS_TOKEN", "")
        sender = current_app.config.get("SMS_SENDER", "PeakRent")

        if not token:
            current_app.logger.warning("SMSAPI_TOKEN не настроен")
            return False

        try:
            response = requests.post(
                cls.SMS_API_URL,
                json={
                    "token":   token,
                    "phone":   phone,
                    "message": f"PeakRent код подтверждения: {code}. Действителен 10 минут.",
                    "sender":  sender,
                },
                timeout=5,
            )
            success = response.status_code == 200
            if not success:
                current_app.logger.warning(
                    f"SMS API ошибка: {response.status_code} {response.text}"
                )
            return success

        except requests.RequestException as e:
            current_app.logger.error(f"Ошибка отправки SMS: {e}")
            return False

    @classmethod
    def send_booking_confirmation(cls, phone: str, booking_number: str) -> bool:
        """
        Отправляет SMS подтверждение бронирования.

        Args:
            phone:          номер телефона
            booking_number: номер брони (PR-2025-00042)

        Returns:
            bool: True если отправка успешна
        """
        if current_app.config.get("DEV_MODE", True):
            current_app.logger.info(f"[DEV] Подтверждение {booking_number} → {phone}")
            return True

        token  = current_app.config.get("SMS_TOKEN", "")
        sender = current_app.config.get("SMS_SENDER", "PeakRent")

        if not token:
            return False

        message = (
            f"PeakRent: бронирование #{booking_number} подтверждено! "
            f"Покажите QR-код при получении снаряжения. "
            f"Подробности: peakrent.kz"
        )

        try:
            response = requests.post(
                cls.SMS_API_URL,
                json={"token": token, "phone": phone,
                      "message": message, "sender": sender},
                timeout=5,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False
