from datetime import datetime
from ..extensions import db


class Booking(db.Model):
    __tablename__ = "bookings"

    id             = db.Column(db.Integer, primary_key=True)
    user_id        = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    start_date     = db.Column(db.Date, nullable=False)
    end_date       = db.Column(db.Date, nullable=False)

    # Финансы
    total_price    = db.Column(db.Integer, default=0)

    # Статус бронирования
    status         = db.Column(db.String(20), default="pending")

    # Информация об оплате
    payment_method = db.Column(db.String(20), nullable=True)  # "kaspi" "card"
    kaspi_order_id = db.Column(db.String(100), nullable=True)  # ID заказа в Kaspi

    confirmed_at   = db.Column(db.String(50), nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    notes          = db.Column(db.Text, default="")

    # Связи с другими таблицами
    user  = db.relationship("User",        back_populates="bookings")
    items = db.relationship("BookingItem", back_populates="booking",
                            cascade="all, delete-orphan",  # удаляет позиции вместе с заказом
                            lazy="joined")                  # загружает позиции сразу с заказом

    # ── Вычисляемые свойства ──────────────────────────────────────────────────

    @property
    def days(self) -> int:
        """Количество дней аренды."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days
        return 0

    @property
    def booking_number(self) -> str:
        year = self.created_at.year if self.created_at else 2025
        return f"PR-{year}-{self.id:05d}"

    def to_dict(self) -> dict:
        return {
            "id":             self.id,
            "booking_number": self.booking_number,
            "user_id":        self.user_id,
            "user": {
                "id":    self.user.id,
                "name":  self.user.name,
                "phone": self.user.phone,
            } if self.user else None,
            "items":          [i.to_dict() for i in self.items],
            "start_date":     self.start_date.isoformat() if self.start_date else None,
            "end_date":       self.end_date.isoformat()   if self.end_date   else None,
            "days":           self.days,
            "total_price":    self.total_price,
            "status":         self.status,
            "payment_method": self.payment_method,
            "kaspi_order_id": self.kaspi_order_id,
            "confirmed_at":   self.confirmed_at,
            "created_at":     self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Booking #{self.id} {self.status} {self.total_price}₸>"


class BookingItem(db.Model):
    """
    Позиция бронирования — конкретная единица снаряжения в заказе.

    Пример: заказ №42 содержит:
        - Лыжный комплект, размер 170, 1 шт., 2 дня = 44 000 ₸
        - Горнолыжный шлем, размер L, 1 шт., 2 дня = 10 000 ₸
    """

    __tablename__ = "booking_items"

    id            = db.Column(db.Integer, primary_key=True)
    booking_id    = db.Column(db.Integer, db.ForeignKey("bookings.id"), nullable=False)
    equipment_id  = db.Column(db.Integer, db.ForeignKey("equipment.id"), nullable=False)
    quantity      = db.Column(db.Integer, default=1)
    size          = db.Column(db.String(20), nullable=True)   # Выбранный размер
    price_per_day = db.Column(db.Integer, default=0)          # Цена на момент бронирования
    subtotal      = db.Column(db.Integer, default=0)          # Итого по этой позиции

    # Связи
    booking   = db.relationship("Booking",   back_populates="items")
    equipment = db.relationship("Equipment", back_populates="b_items")

    def to_dict(self) -> dict:
        """Сериализует позицию для JSON-ответа API."""
        return {
            "id":              self.id,
            "equipment_id":    self.equipment_id,
            "equipment_name":  self.equipment.name_ru  if self.equipment else "",
            "equipment_image": self.equipment.image_url if self.equipment else "",
            "quantity":        self.quantity,
            "size":            self.size,
            "price_per_day":   self.price_per_day,
            "subtotal":        self.subtotal,
        }

    def __repr__(self):
        return f"<BookingItem booking={self.booking_id} eq={self.equipment_id}>"
