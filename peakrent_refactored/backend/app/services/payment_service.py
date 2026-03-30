"""
app/services/payment_service.py — Сервис оплаты

Интеграция с платёжными системами:
    1. Kaspi QR   — основной метод (80% пользователей в КЗ используют Kaspi)
    2. Карта      — Visa/Mastercard через CloudPayments
    3. Наличные   — оплата при получении снаряжения

Архитектура оплаты через Kaspi QR:
    1. Клиент → POST /api/payments/kaspi/init
    2. Сервер → запрашивает QR у Kaspi API → возвращает base64 QR
    3. Клиент → показывает QR пользователю
    4. Пользователь → сканирует QR в приложении Kaspi
    5. Kaspi → POST /api/payments/kaspi/webhook (подтверждение)
    6. Сервер → меняет статус бронирования на "confirmed"
    7. Клиент → GET /api/payments/{id}/status (опрос каждые 3 сек)

Примечание: В текущей реализации используется демо-режим.
    В продакшне нужно подключить реальный Kaspi Business API.
"""

import uuid
import base64
from datetime import datetime, timedelta
from flask import current_app


class PaymentService:
    """Сервис обработки платежей."""

    @staticmethod
    def create_kaspi_qr(booking_id, amount: float, name: str, phone: str) -> dict:
        """
        Создаёт Kaspi QR код для оплаты.

        В продакшне: отправляет запрос в Kaspi Business API,
        получает реальный QR код.

        В демо-режиме: генерирует SVG-заглушку QR кода.

        Args:
            booking_id: ID бронирования
            amount:     сумма оплаты в тенге
            name:       имя плательщика
            phone:      телефон плательщика

        Returns:
            dict: payment_id, qr_code (base64), expires_at, amount
        """
        # Генерируем уникальный ID платежа
        payment_id = f"KASPI-{str(uuid.uuid4())[:8].upper()}"

        # В продакшне здесь будет вызов Kaspi Business API:
        # response = requests.post(
        #     "https://api.kaspi.kz/business/v2/qr/create",
        #     headers={"Authorization": f"Bearer {current_app.config['KASPI_KEY']}"},
        #     json={"amount": amount, "orderId": payment_id, ...}
        # )

        # Демо: генерируем SVG QR-заглушку
        qr_svg = PaymentService._generate_demo_qr_svg(payment_id, amount)
        qr_b64 = "data:image/svg+xml;base64," + base64.b64encode(qr_svg.encode()).decode()

        # QR действителен 30 минут
        expires_at = (datetime.utcnow() + timedelta(minutes=30)).isoformat() + "Z"

        return {
            "payment_id": payment_id,
            "qr_code":    qr_b64,
            "expires_at": expires_at,
            "amount":     float(amount),
        }

    @staticmethod
    def create_card_payment(booking_id, amount: float, name: str, phone: str) -> dict:
        """
        Инициирует оплату картой через CloudPayments.

        В продакшне: создаёт платёжную сессию в CloudPayments.

        Args:
            booking_id: ID бронирования
            amount:     сумма в тенге
            name:       имя плательщика
            phone:      телефон

        Returns:
            dict: payment_id, payment_url (ссылка на форму оплаты)
        """
        payment_id   = f"CARD-{str(uuid.uuid4())[:8].upper()}"
        payment_url  = f"https://checkout.cloudpayments.ru/?invoice={payment_id}"

        # В продакшне:
        # response = requests.post(
        #     "https://api.cloudpayments.ru/orders/create",
        #     auth=(CLOUDPAYMENTS_ID, CLOUDPAYMENTS_SECRET),
        #     json={"Amount": amount, "Currency": "KZT", ...}
        # )

        return {
            "payment_id":  payment_id,
            "payment_url": payment_url,
        }

    @staticmethod
    def verify_kaspi_webhook_signature(body: bytes, signature: str) -> bool:
        """
        Проверяет подпись вебхука от Kaspi.

        Kaspi подписывает каждый вебхук HMAC-SHA256 подписью.
        Это защищает от поддельных уведомлений.

        В продакшне ОБЯЗАТЕЛЬНО включить эту проверку!

        Args:
            body:      тело запроса (сырые байты)
            signature: подпись из заголовка X-Kaspi-Signature

        Returns:
            bool: True если подпись валидна
        """
        import hmac
        import hashlib

        secret  = current_app.config.get("KASPI_WEBHOOK_SECRET", "")
        if not secret:
            return True  # В dev-режиме пропускаем проверку

        expected = hmac.new(
            secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected, signature)

    @staticmethod
    def _generate_demo_qr_svg(payment_id: str, amount: float) -> str:
        """
        Генерирует SVG-заглушку QR кода для демонстрации.

        В реальном проекте этот метод не нужен — Kaspi API
        возвращает настоящий QR код.
        """
        amount_str = f"{int(amount):,} ₸"
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">'
            f'<rect width="256" height="256" fill="white"/>'
            f'<text x="128" y="90" text-anchor="middle" font-size="14" fill="#0A1628" font-family="sans-serif">Kaspi QR</text>'
            f'<text x="128" y="118" text-anchor="middle" font-size="11" fill="#0EA5E9" font-family="monospace">{payment_id}</text>'
            f'<text x="128" y="148" text-anchor="middle" font-size="18" fill="#0A1628" font-weight="bold" font-family="sans-serif">{amount_str}</text>'
            f'<text x="128" y="175" text-anchor="middle" font-size="9" fill="#64748B" font-family="sans-serif">Kaspi → Оплатить → QR-код</text>'
            f'<rect x="48" y="188" width="160" height="24" rx="4" fill="#0EA5E9"/>'
            f'<text x="128" y="204" text-anchor="middle" font-size="11" fill="white" font-family="sans-serif">ДЕМО РЕЖИМ</text>'
            f'</svg>'
        )
