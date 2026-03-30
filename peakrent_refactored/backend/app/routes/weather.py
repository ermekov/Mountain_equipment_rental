"""
app/routes/weather.py — Маршрут погоды

Blueprint: weather_bp → префикс /api/weather

Маршруты:
    GET /api/weather  — текущая погода в городе
"""

from flask import Blueprint, request, jsonify
from ..services.weather_service import WeatherService

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("", methods=["GET"])
def get_weather():
    """
    Возвращает текущую погоду в указанном городе.

    Query params:
        city — название города (по умолчанию Алматы)

    Response: {
        "temp":       -3,
        "feels_like": -7,
        "condition":  "снег",
        "humidity":   78,
        "wind_speed": 5,
        "city":       "Алматы"
    }
    """
    city         = request.args.get("city", "Алматы")
    weather_data = WeatherService.get_current(city)
    return jsonify(weather_data), 200
