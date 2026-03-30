"""
app/__init__.py — Application Factory

Паттерн "Application Factory" позволяет:
1. Создавать несколько экземпляров приложения (для тестов, продакшна)
2. Избежать циклических импортов
3. Гибко конфигурировать приложение

Принцип работы:
    create_app() → инициализирует Flask → подключает расширения
               → регистрирует Blueprint'ы → возвращает готовое приложение
"""

from flask import Flask
from .config import Config
from .extensions import db, cors
from .seed import seed_database


def create_app(config_class=Config):
    """
    Создаёт и настраивает Flask-приложение.

    Args:
        config_class: класс конфигурации (по умолчанию — Config)

    Returns:
        Flask: готовое приложение
    """
    app = Flask(__name__)

    # 1. Загружаем конфигурацию
    app.config.from_object(config_class)

    # 2. Инициализируем расширения (db, cors)
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # 3. Регистрируем Blueprint'ы (группы маршрутов)
    _register_blueprints(app)

    # 4. Создаём таблицы и заполняем БД при первом запуске
    with app.app_context():
        db.create_all()
        seed_database()

    return app


def _register_blueprints(app: Flask):
    """
    Регистрирует все Blueprint'ы приложения.

    Blueprint — это группа связанных маршрутов.
    Каждый Blueprint отвечает за свою область:
        /api/auth/*         → аутентификация пользователей
        /api/equipment/*    → снаряжение
        /api/bookings/*     → бронирования
        /api/payments/*     → оплата (Kaspi QR, карта)
        /api/recommendations → AI-рекомендации
        /api/reviews/*      → отзывы
        /api/weather        → погода
        /api/admin/*        → административная панель
    """
    from .routes.auth        import auth_bp
    from .routes.equipment   import equipment_bp
    from .routes.bookings    import bookings_bp
    from .routes.payments    import payments_bp
    from .routes.recommendations import recommendations_bp
    from .routes.reviews     import reviews_bp
    from .routes.weather     import weather_bp
    from .routes.admin       import admin_bp

    app.register_blueprint(auth_bp,             url_prefix="/api/auth")
    app.register_blueprint(equipment_bp,        url_prefix="/api/equipment")
    app.register_blueprint(bookings_bp,         url_prefix="/api/bookings")
    app.register_blueprint(payments_bp,         url_prefix="/api/payments")
    app.register_blueprint(recommendations_bp,  url_prefix="/api")
    app.register_blueprint(reviews_bp,          url_prefix="/api/reviews")
    app.register_blueprint(weather_bp,          url_prefix="/api/weather")
    app.register_blueprint(admin_bp,            url_prefix="/api/admin")

    # Обработчики ошибок
    @app.errorhandler(404)
    def not_found(e):
        from flask import jsonify
        return jsonify({"error": "Не найдено"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        from flask import jsonify
        return jsonify({"error": "Метод не разрешён"}), 405

    @app.errorhandler(500)
    def server_error(e):
        from flask import jsonify
        return jsonify({"error": "Внутренняя ошибка сервера"}), 500
