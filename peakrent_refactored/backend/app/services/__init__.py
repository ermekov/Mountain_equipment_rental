"""
app/services/__init__.py — Пакет бизнес-логики (Services Layer)

Принцип разделения ответственности (Separation of Concerns):

    Routes    — только HTTP: принять запрос, вернуть ответ
    Services  — бизнес-логика: алгоритмы, расчёты, внешние API
    Models    — только данные: CRUD операции с БД

Пример:
    НЕПРАВИЛЬНО (всё в route):
        @app.route("/recommendations")
        def recommendations():
            # 100 строк бизнес-логики прямо в маршруте...

    ПРАВИЛЬНО (логика в сервисе):
        @recommendations_bp.route("")
        def recommendations():
            result = RecommendationService.get_recommendations(...)
            return jsonify(result)
"""

from .ai_service      import AIService
from .weather_service import WeatherService
from .payment_service import PaymentService
from .sms_service     import SMSService
