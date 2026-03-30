"""
app/routes/auth.py — Маршруты аутентификации

Blueprint: auth_bp → префикс /api/auth

Маршруты:
    POST /api/auth/send-otp    — отправить SMS код
    POST /api/auth/verify-otp  — проверить код и получить JWT
    GET  /api/auth/me          — получить данные текущего пользователя
    PUT  /api/auth/me          — обновить профиль

Поток аутентификации:
    1. POST /send-otp с {phone}       → OTP отправлен на номер
    2. POST /verify-otp с {phone,code} → получаем {access_token, user}
    3. Используем access_token в заголовке: Authorization: Bearer <token>
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app, g

from ..extensions import db
from ..models import User, OTPCode
from ..utils.auth import make_token, login_required
from ..services.sms_service import SMSService

# Создаём Blueprint
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/send-otp", methods=["POST"])
def send_otp():
    """
    Отправляет OTP код на указанный номер телефона.

    Body: { "phone": "+77071234567" }
    Response: { "message": "OTP отправлен" }
    Dev-mode: { "message": "OTP отправлен", "dev_code": "123456" }
    """
    data  = request.get_json() or {}
    phone = data.get("phone", "").strip()

    if not phone:
        return jsonify({"error": "Поле 'phone' обязательно"}), 400

    # Валидация формата телефона
    digits = phone.replace("+", "").replace(" ", "").replace("-", "")
    if not digits.isdigit() or len(digits) < 10:
        return jsonify({"error": "Неверный формат телефона. Используйте +77XXXXXXXXX"}), 400

    # Генерируем OTP код
    code = SMSService.generate_otp()

    # Инвалидируем предыдущие неиспользованные коды для этого номера
    OTPCode.query.filter_by(phone=phone, used=False).delete()

    # Сохраняем новый код (действителен 10 минут)
    otp = OTPCode(
        phone=phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.session.add(otp)
    db.session.commit()

    # Отправляем SMS
    SMSService.send_otp(phone, code)

    response = {"message": "OTP отправлен на " + phone}

    # В dev-режиме возвращаем код для удобства тестирования
    if current_app.config.get("DEV_MODE", True):
        response["dev_code"] = code

    return jsonify(response), 200


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    """
    Проверяет OTP код и выдаёт JWT токен.

    Body: { "phone": "+77071234567", "code": "123456" }
    Response: { "access_token": "eyJ...", "user": {...} }
    """
    data  = request.get_json() or {}
    phone = data.get("phone", "").strip()
    code  = data.get("code", "").strip()

    if not phone or not code:
        return jsonify({"error": "Поля 'phone' и 'code' обязательны"}), 400

    # Ищем актуальный неиспользованный код
    otp = (
        OTPCode.query
        .filter_by(phone=phone, code=code, used=False)
        .filter(OTPCode.expires_at > datetime.utcnow())
        .first()
    )

    if not otp:
        return jsonify({"error": "Неверный или истёкший код подтверждения"}), 400

    # Помечаем код как использованный
    otp.used = True

    # Ищем или создаём пользователя
    user = User.query.filter_by(phone=phone).first()
    if not user:
        # Новый пользователь — регистрируем автоматически
        user = User(phone=phone, name=phone[-4:])  # Имя по умолчанию — последние 4 цифры
        db.session.add(user)

    db.session.commit()

    # Создаём JWT токен
    token = make_token(user.id, user.role)

    return jsonify({
        "access_token": token,
        "user":         user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_me():
    """
    Возвращает данные текущего пользователя.

    Headers: Authorization: Bearer <token>
    Response: { "id": 1, "phone": "...", "name": "...", "role": "user" }
    """
    return jsonify(g.user.to_dict()), 200


@auth_bp.route("/me", methods=["PUT"])
@login_required
def update_me():
    """
    Обновляет профиль текущего пользователя.

    Body: { "name": "Новое имя" }
    Response: обновлённый объект пользователя
    """
    data = request.get_json() or {}

    if "name" in data:
        name = data["name"].strip()
        if len(name) < 1:
            return jsonify({"error": "Имя не может быть пустым"}), 400
        g.user.name = name

    db.session.commit()
    return jsonify(g.user.to_dict()), 200
