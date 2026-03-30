"""
app/utils/auth.py — JWT авторизация и декораторы защиты маршрутов

Роли в системе:
    user    — обычный клиент (вход через SMS OTP)
    manager — менеджер (вход через email+пароль, управляет заказами)
    admin   — администратор (полный доступ)

Иерархия прав:
    admin   → всё
    manager → заказы + клиенты (НЕ может менять снаряжение и настройки)
    user    → только свои данные

Декораторы:
    @login_required    — любой авторизованный
    @optional_auth     — авторизация необязательна
    @manager_required  — менеджер или admin
    @admin_required    — только admin
"""

from functools import wraps
from datetime import datetime, timedelta

import jwt
from flask import request, jsonify, g, current_app


def make_token(user_id: int, role: str) -> str:
    """
    Создаёт JWT токен.
    Role кладём ВНУТРЬ токена — сервер знает роль без запроса в БД.
    """
    payload = {
        "user_id": user_id,
        "role":    role,
        "exp":     datetime.utcnow() + timedelta(hours=current_app.config["JWT_HOURS"]),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_token(token: str) -> dict:
    """Декодирует и проверяет JWT токен."""
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def login_required(f):
    """Декоратор: требует любой авторизации. Кладёт пользователя в g.user."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = auth_header[7:] if auth_header.startswith("Bearer ") else None

        if not token:
            return jsonify({"error": "Требуется авторизация"}), 401

        try:
            payload = decode_token(token)
            from ..models import User
            g.user = User.query.get(payload["user_id"])
            if not g.user:
                return jsonify({"error": "Пользователь не найден"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Токен истёк. Войдите заново."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Недействительный токен"}), 401

        return f(*args, **kwargs)
    return decorated


def optional_auth(f):
    """Декоратор: авторизация необязательна. g.user = None если не вошёл."""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.user = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                payload = decode_token(auth_header[7:])
                from ..models import User
                g.user = User.query.get(payload["user_id"])
            except Exception:
                pass
        return f(*args, **kwargs)
    return decorated


def manager_required(f):
    """
    Декоратор: доступ для менеджера И администратора.

    Менеджер управляет заказами, но не может:
        - менять снаряжение (CRUD продуктов)
        - удалять пользователей
        - менять роли

    Пример:
        @admin_bp.route("/bookings")
        @manager_required          ← доступно manager + admin
        def bookings():
            ...
    """
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.user.role not in ("manager", "admin"):
            return jsonify({"error": "Доступ запрещён. Нужна роль manager или admin."}), 403
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    """
    Декоратор: только администратор.
    Для операций с высоким риском: удаление, изменение ролей, настройки.
    """
    @wraps(f)
    @login_required
    def decorated(*args, **kwargs):
        if g.user.role != "admin":
            return jsonify({"error": "Доступ запрещён. Только для администраторов."}), 403
        return f(*args, **kwargs)
    return decorated
