"""
app/extensions.py — Flask расширения

Почему расширения выделены в отдельный файл?

Проблема "циклических импортов":
    models.py импортирует db из app/__init__.py
    app/__init__.py импортирует models.py
    → Python не может разрешить этот цикл

Решение — вынести db в отдельный файл extensions.py:
    extensions.py создаёт db (без привязки к app)
    models.py импортирует db из extensions.py
    app/__init__.py вызывает db.init_app(app) для привязки
"""

from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# SQLAlchemy — ORM для работы с базой данных
# ORM (Object-Relational Mapping) позволяет работать с таблицами
# как с Python-объектами, не писать SQL вручную
db = SQLAlchemy()

# CORS — Cross-Origin Resource Sharing
# Позволяет фронтенду (localhost:3000) обращаться к API (localhost:5000)
# без блокировки браузером
cors = CORS()
