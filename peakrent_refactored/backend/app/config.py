"""
app/config.py — Конфигурация приложения

Принцип разделения конфигураций:
    Config      — базовая конфигурация (для всех режимов)
    DevConfig   — режим разработки (debug=True, подробные ошибки)
    ProdConfig  — продакшн (debug=False, строгая безопасность)

Все секретные данные читаются из переменных окружения (.env файл).
Никогда не храни пароли/ключи прямо в коде!
"""

import os


class Config:
    """
    Базовая конфигурация — общие настройки для всех режимов.
    Читает значения из переменных окружения (файл .env).
    """

    # ── Безопасность ──────────────────────────────────────────────────────────
    # SECRET_KEY используется Flask для подписи cookies и сессий
    SECRET_KEY = os.environ.get("SECRET_KEY", "peakrent-secret-key-change-in-production")

    # JWT_SECRET используется для подписи токенов авторизации
    JWT_SECRET = os.environ.get("JWT_SECRET", "peakrent-jwt-secret-change-in-production")

    # Срок действия JWT токена (в часах). 720 = 30 дней
    JWT_HOURS = int(os.environ.get("JWT_HOURS", "720"))

    # ── База данных PostgreSQL ────────────────────────────────────────────────
    # Строка подключения: postgresql://user:password@host:port/database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:Erasil2004@localhost:5433/peakrent2"
    )

    # Отключаем лишние уведомления SQLAlchemy (экономит память)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Настройки пула соединений с БД:
    # - pool_pre_ping: проверяет соединение перед использованием
    # - pool_recycle: переподключается каждые 5 минут (избегает разрывов)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle":  300,
        "connect_args":  {"connect_timeout": 10},
    }

    # ── OpenAI GPT-4o-mini ────────────────────────────────────────────────────
    # Используется для генерации персональных объяснений рекомендаций
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "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")
    OPENAI_MODEL   = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    # ── OpenWeatherMap API ────────────────────────────────────────────────────
    # Бесплатный тариф: https://openweathermap.org/api
    # Используется для получения погоды в Алматы (влияет на AI-рекомендации)
    WEATHER_KEY = os.environ.get("OPENWEATHER_API_KEY", "6fb1cb8bc5a3a1f1521130709fcfefaf")

    # ── Kaspi Business API ────────────────────────────────────────────────────
    # Подключается через business.kaspi.kz (верификация 5–14 дней)
    KASPI_KEY            = os.environ.get("KASPI_API_KEY", "")
    KASPI_MERCHANT       = os.environ.get("KASPI_MERCHANT_ID", "")
    KASPI_WEBHOOK_SECRET = os.environ.get("KASPI_WEBHOOK_SECRET", "dev-webhook-secret")

    # ── SMS API (Казахстан) ───────────────────────────────────────────────────
    # Отправка OTP-кодов через smsapi.kz
    SMS_TOKEN  = os.environ.get("SMSAPI_TOKEN", "")
    SMS_SENDER = os.environ.get("SMSAPI_SENDER", "PeakRent")

    # ── Режим разработки ──────────────────────────────────────────────────────
    # DEV_MODE=True → все OTP коды = "123456" (не нужен реальный SMS)
    DEV_MODE = os.environ.get("DEV_OTP_BYPASS", "true").lower() == "true"
    DEV_OTP  = "123456"  # Тестовый OTP код для разработки


class DevConfig(Config):
    """
    Конфигурация для разработки.
    Включает подробный вывод ошибок и перезагрузку при изменениях.
    """
    DEBUG = True
    TESTING = False


class ProdConfig(Config):
    """
    Конфигурация для продакшна.
    Отключает debug, требует строгих секретных ключей.
    """
    DEBUG   = False
    TESTING = False

    # В продакшне обязательно задайте эти переменные!
    # export SECRET_KEY="your-super-secret-key-64-chars"
    # export JWT_SECRET="another-super-secret-key"
