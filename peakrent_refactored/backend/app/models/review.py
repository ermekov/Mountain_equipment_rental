"""
app/models/review.py — Модель отзыва

Review — отзыв пользователя о снаряжении.

Отзывы важны для:
    1. Доверие новых пользователей (социальное доказательство)
    2. AI-рекомендации (популярность снаряжения)
    3. Контроль качества снаряжения
"""

from datetime import datetime
from ..extensions import db


class Review(db.Model):
    """
    Отзыв пользователя о снаряжении.

    Пользователь может оставить отзыв после завершения аренды.
    Рейтинг от 1 до 5 звёзд + текстовый комментарий.
    """

    __tablename__ = "reviews"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    equipment_id = db.Column(db.Integer, db.ForeignKey("equipment.id"), nullable=False)
    booking_id   = db.Column(db.Integer, nullable=True)   # Ссылка на бронирование

    rating       = db.Column(db.Integer, default=5)       # Оценка от 1 до 5
    comment      = db.Column(db.Text,    default="")      # Текст отзыва

    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    # Связи
    user      = db.relationship("User",      back_populates="reviews")
    equipment = db.relationship("Equipment", back_populates="reviews")

    def to_dict(self) -> dict:
        """Сериализует отзыв для JSON-ответа API."""
        return {
            "id":     self.id,
            "user": {
                "id":   self.user.id,
                "name": self.user.name,
            } if self.user else None,
            "equipment_id": self.equipment_id,
            "booking_id":   self.booking_id,
            "rating":       self.rating,
            "comment":      self.comment,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Review user={self.user_id} eq={self.equipment_id} rating={self.rating}>"
