import json
from datetime import datetime
from sqlalchemy import func
from ..extensions import db


class Category(db.Model):
    __tablename__ = "categories"

    id         = db.Column(db.Integer, primary_key=True)
    slug       = db.Column(db.String(60),  unique=True, nullable=False)
    name_ru    = db.Column(db.String(120), default="")
    name_kk    = db.Column(db.String(120), default="")
    name_en    = db.Column(db.String(120), default="")
    icon       = db.Column(db.String(10),  default="")
    sort_order = db.Column(db.Integer,     default=0)

    # Связь: одна категория → много единиц снаряжения
    equipment = db.relationship("Equipment", back_populates="category", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id":      self.id,
            "slug":    self.slug,
            "icon":    self.icon,
            "name_ru": self.name_ru,
            "name_kk": self.name_kk,
            "name_en": self.name_en,
        }

    def __repr__(self):
        return f"<Category {self.slug}>"


class Equipment(db.Model):
    __tablename__ = "equipment"

    id             = db.Column(db.Integer, primary_key=True)
    slug           = db.Column(db.String(120), unique=True, nullable=False)
    category_id    = db.Column(db.Integer, db.ForeignKey("categories.id"))

    # Названия на трёх языках
    name_ru        = db.Column(db.String(200), default="")
    name_kk        = db.Column(db.String(200), default="")
    name_en        = db.Column(db.String(200), default="")

    # Описания на трёх языках
    description_ru = db.Column(db.Text, default="")
    description_kk = db.Column(db.Text, default="")
    description_en = db.Column(db.Text, default="")

    # Финансовые поля
    price_per_day  = db.Column(db.Integer, default=0)
    deposit_amount = db.Column(db.Integer, default=0)

    # Наличие
    stock          = db.Column(db.Integer, default=1)

    # JSON-поля (хранятся как строки, декодируются при использовании)
    images         = db.Column(db.Text, default="[]")     # Список URL фотографий
    tags           = db.Column(db.Text, default="[]")     # Теги для поиска
    sizes          = db.Column(db.Text, default="[]")     # Доступные размеры
    peak_months    = db.Column(db.Text, default="[]")     # Пиковые месяцы спроса

    # Тип размерной сетки
    size_type      = db.Column(db.String(30), default="none")
    gender         = db.Column(db.String(10), nullable=True, default="unisex")

    # Статусы
    is_active      = db.Column(db.Boolean, default=True)   # Доступно для аренды
    is_featured    = db.Column(db.Boolean, default=False)  # На главной странице

    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    # Связи
    category = db.relationship("Category",   back_populates="equipment")
    b_items  = db.relationship("BookingItem", back_populates="equipment", lazy="dynamic")
    reviews  = db.relationship("Review",      back_populates="equipment", lazy="dynamic")
    favorites = db.relationship("Favorite",   back_populates="equipment", lazy="dynamic", cascade="all, delete-orphan")

    # ── Вычисляемые свойства ──────────────────────────────────────────────────

    @property
    def image_url(self) -> str:
        """Возвращает URL первого фото (главное изображение)."""
        imgs = json.loads(self.images or "[]")
        return imgs[0] if imgs else ""

    @property
    def avg_rating(self):
        """Вычисляет средний рейтинг из всех отзывов."""
        revs = self.reviews.all()
        if not revs:
            return None
        return round(sum(r.rating for r in revs) / len(revs), 1)

    @property
    def review_count(self) -> int:
        """Количество отзывов."""
        return self.reviews.count()

    def available_stock(self, start_date=None, end_date=None) -> int:
        """
        Вычисляет доступное количество на заданные даты.

        Логика: total_stock - уже_забронировано_на_эти_даты
        Учитывает перекрытие дат: A.start < B.end AND A.end > B.start
        """
        if not start_date or not end_date:
            return self.stock

        # Импортируем здесь чтобы избежать циклических импортов
        from .booking import Booking, BookingItem

        # Суммируем количество забронированных единиц на пересекающиеся даты
        booked = db.session.query(func.sum(BookingItem.quantity)).join(Booking).filter(
            BookingItem.equipment_id == self.id,
            Booking.status.in_(["confirmed", "pending"]),
            Booking.start_date < end_date,
            Booking.end_date   > start_date,
        ).scalar() or 0

        return max(0, self.stock - booked)

    def to_dict(self, start_date=None, end_date=None) -> dict:
        """
        Сериализует модель в словарь для JSON-ответа API.

        Args:
            start_date: начало аренды (для расчёта доступности)
            end_date:   конец аренды (для расчёта доступности)
        """
        return {
            "id":              self.id,
            "slug":            self.slug,
            "category_id":     self.category_id,
            "name_ru":         self.name_ru,
            "name_kk":         self.name_kk,
            "name_en":         self.name_en,
            "description_ru":  self.description_ru,
            "description_kk":  self.description_kk,
            "description_en":  self.description_en,
            "price_per_day":   self.price_per_day,
            "deposit":         self.deposit_amount,
            "stock":           self.available_stock(start_date, end_date),
            "image_url":       self.image_url,
            "images":          json.loads(self.images  or "[]"),
            "sizes":           json.loads(self.sizes   or "[]"),
            "tags":            json.loads(self.tags    or "[]"),
            "size_type":       self.size_type,
            "gender":          self.gender or "unisex",
            "is_featured":     self.is_featured,
            "avg_rating":      self.avg_rating,
            "review_count":    self.review_count,
            "category":        self.category.to_dict() if self.category else None,
        }

    def __repr__(self):
        return f"<Equipment {self.slug} ({self.price_per_day}₸/день)>"
