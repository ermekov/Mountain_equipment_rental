"""
app/models/__init__.py — Пакет моделей базы данных

Экспортирует все модели для удобного импорта:
    from app.models import User, Equipment, Booking
вместо:
    from app.models.user import User
    from app.models.equipment import Equipment
    ...
"""

from .user      import User, OTPCode
from .equipment import Equipment, Category
from .booking   import Booking, BookingItem
from .favorite  import Favorite
from .review    import Review

# Список всех моделей (используется при документировании)
__all__ = [
    "User",
    "OTPCode",
    "Category",
    "Equipment",
    "Booking",
    "BookingItem",
    "Favorite",
    "Review",
]
