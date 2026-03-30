"""
run.py — точка входа приложения PeakRent.kz

Запуск в режиме разработки:
    python run.py

Запуск в продакшне (gunicorn):
    gunicorn -w 4 -b 0.0.0.0:5000 "run:create_app()"

Архитектура проекта (Application Factory Pattern):
    ┌─ run.py               ← точка входа
    ├─ app/
    │   ├─ __init__.py      ← создание Flask app (Application Factory)
    │   ├─ config.py        ← конфигурация (Dev / Prod)
    │   ├─ extensions.py    ← инициализация расширений (db, cors)
    │   ├─ models/          ← SQLAlchemy модели (таблицы БД)
    │   ├─ routes/          ← Blueprint маршруты (REST API)
    │   ├─ services/        ← бизнес-логика
    │   └─ utils/           ← вспомогательные функции
    └─ seed.py              ← заполнение БД тестовыми данными
"""

import os
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()

from app import create_app

# Создаём приложение (Application Factory Pattern)
app = create_app()

if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"

    print("\n" + "="*55)
    print("🏔  PeakRent.kz — Backend Server")
    print("="*55)
    print(f"   URL:      http://localhost:{port}")
    print(f"   Debug:    {debug}")
    print(f"   OpenAI:   {'✅ настроен' if os.environ.get('OPENAI_API_KEY') else '❌ нет ключа'}")
    print(f"   OTP режим: {'DEV (123456)' if os.environ.get('DEV_OTP_BYPASS','true')=='true' else 'SMS'}")
    print("="*55 + "\n")

    app.run(host="0.0.0.0", port=port, debug=debug)
