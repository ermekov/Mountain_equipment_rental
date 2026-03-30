"""
app/routes/__init__.py — Пакет маршрутов API

Blueprint — это группа связанных маршрутов Flask.
Каждый Blueprint регистрируется с префиксом URL в app/__init__.py.

Маршруты:
    auth_bp         → /api/auth/*
    equipment_bp    → /api/equipment/*
    bookings_bp     → /api/bookings/*
    payments_bp     → /api/payments/*
    recommendations_bp → /api/recommendations, /api/ai/*
    reviews_bp      → /api/reviews/*
    weather_bp      → /api/weather
    admin_bp        → /api/admin/*
"""
