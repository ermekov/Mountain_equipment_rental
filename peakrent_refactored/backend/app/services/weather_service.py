"""
app/services/weather_service.py — Сервис погоды

Получает данные о текущей погоде через OpenWeatherMap API.
Погода влияет на AI-рекомендации снаряжения:
    - Снег  → рекомендуем лыжи, сноуборд, термобельё
    - Дождь → рекомендуем водонепроницаемое снаряжение
    - Мороз → рекомендуем тёплые слои одежды
"""

import requests
from flask import current_app


class WeatherService:
    """Сервис получения погодных данных."""

    # URL OpenWeatherMap API
    WEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"

    # Данные по умолчанию (когда API недоступен или ключ не настроен)
    # Алматы: зимой обычно снег и мороз
    DEFAULT_WEATHER = {
        "temp":       -3,
        "feels_like": -7,
        "condition":  "Снег",
        "humidity":   78,
        "wind_speed": 5,
        "city":       "Алматы",
    }

    @classmethod
    def get_current(cls, city: str = "Алматы") -> dict:
        """
        Возвращает текущую погоду для указанного города.

        Args:
            city: название города (на русском или английском)

        Returns:
            dict с полями: temp, feels_like, condition, humidity, wind_speed, city
        """
        api_key = current_app.config.get("WEATHER_KEY", "")

        if not api_key:
            # Ключ не настроен → возвращаем демо-данные
            current_app.logger.debug("OPENWEATHER_API_KEY не настроен, используем демо-данные")
            return {**cls.DEFAULT_WEATHER, "city": city}

        try:
            response = requests.get(
                cls.WEATHER_API_URL,
                params={
                    "q":     city + ",KZ",  # KZ = Kazakhstan
                    "appid": api_key,
                    "units": "metric",       # Цельсий
                    "lang":  "ru",           # Описание на русском
                },
                timeout=5,
            )

            if response.status_code != 200:
                current_app.logger.warning(
                    f"OpenWeatherMap вернул {response.status_code} для города {city}"
                )
                return {**cls.DEFAULT_WEATHER, "city": city}

            data = response.json()
            return {
                "temp":       round(data["main"]["temp"]),
                "feels_like": round(data["main"]["feels_like"]),
                "condition":  data["weather"][0]["description"],
                "humidity":   data["main"]["humidity"],
                "wind_speed": round(data["wind"]["speed"]),
                "city":       city,
            }

        except requests.Timeout:
            current_app.logger.warning(f"Timeout при запросе погоды для {city}")
        except requests.RequestException as e:
            current_app.logger.warning(f"Ошибка запроса погоды: {e}")
        except (KeyError, IndexError) as e:
            current_app.logger.warning(f"Неожиданный формат ответа погоды: {e}")

        return {**cls.DEFAULT_WEATHER, "city": city}
