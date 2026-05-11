"""
app/models/user.py — Модели пользователей

User    — пользователь системы (вход через SMS OTP или email/пароль для admin)
OTPCode — одноразовый SMS код для обычных пользователей

Два способа входа:
    Обычный пользователь → вводит телефон → получает SMS → вводит OTP
    Администратор        → вводит email + пароль (удобнее для управления)
"""

from datetime import datetime
from ..extensions import db


class User(db.Model):
    """
    Модель пользователя.

    Поля:
        id         — первичный ключ
        phone      — телефон для SMS входа (+77XXXXXXXXX)
        name       — имя
        email      — email (для admin входа по паролю)
        password   — хэш пароля (только для admin, обычные юзеры = None)
        role       — "user" или "admin"
        created_at — дата регистрации

    Связи:
        bookings → список бронирований
        reviews  → список отзывов
    """

    __tablename__ = "users"

    id         = db.Column(db.Integer,     primary_key=True)
    phone      = db.Column(db.String(20),  unique=True, nullable=True)   # nullable для admin
    name       = db.Column(db.String(120), default="")
    email      = db.Column(db.String(120), unique=True, nullable=True)   # для admin входа
    password   = db.Column(db.String(256), nullable=True)                # хэш, только для admin
    role       = db.Column(db.String(20),  default="user")               # "user" | "admin"
    created_at = db.Column(db.DateTime,    default=datetime.utcnow)

    # Связи
    bookings = db.relationship("Booking", back_populates="user", lazy="dynamic")
    reviews  = db.relationship("Review",  back_populates="user", lazy="dynamic")

    def to_dict(self) -> dict:
        """Сериализует в словарь. Пароль никогда не включаем в ответ API."""
        return {
            "id":         self.id,
            "phone":      self.phone,
            "name":       self.name,
            "email":      self.email,
            "role":       self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<User {self.email or self.phone} ({self.role})>"


class OTPCode(db.Model):
    """
    Одноразовый код подтверждения для телефона или email.

    Жизненный цикл:
        1. Пользователь вводит телефон или email
        2. Создаётся OTPCode (TTL 10 минут)
        3. Пользователь вводит код → used=True → выдаём JWT
    """

    __tablename__ = "otp_codes"

    id         = db.Column(db.Integer,  primary_key=True)
    phone      = db.Column(db.String(120), nullable=False)
    code       = db.Column(db.String(6),   nullable=False)
    expires_at = db.Column(db.DateTime,    nullable=False)
    used       = db.Column(db.Boolean,     default=False)

    def __repr__(self):
        return f"<OTPCode {self.phone} used={self.used}>"
