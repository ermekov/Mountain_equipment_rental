"""
app/routes/recommendations.py — Маршруты рекомендаций и AI чата

Blueprint: recommendations_bp → префикс /api

Маршруты:
    POST /api/recommendations          — AI рекомендации снаряжения
    GET  /api/recommendations/related  — "часто берут вместе"
    POST /api/ai/chat                  — AI чат-консультант
    POST /api/ai/suggest               — быстрый AI совет
"""

from flask import Blueprint, request, jsonify, g

from ..models import Equipment, Booking, BookingItem
from ..extensions import db
from ..services.ai_service import AIService
from ..services.chat_service import ChatService
from ..services.weather_service import WeatherService
from ..utils.auth import optional_auth
from sqlalchemy import func

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/recommendations", methods=["POST"])
@optional_auth
def recommendations():
    """
    Возвращает персональные AI-рекомендации снаряжения.

    Процесс:
        1. Получаем параметры запроса (активность, город, etc.)
        2. Если не передана температура — запрашиваем погоду автоматически
        3. Запускаем rule-based движок (L0) — быстро, <50ms
        4. Обогащаем через GPT-4o-mini (L1) — персональные объяснения
        5. Возвращаем результат

    Body: {
        "activity":    "skiing",     // skiing|snowboard|hiking|camping|climbing|trekking
        "city":        "Алматы",
        "temperature": -3,           // необязательно, берём из погоды автоматически
        "weather":     "snow",       // необязательно
        "limit":       6             // max 12
    }
    """
    data     = request.get_json() or {}
    activity = data.get("activity")
    city     = data.get("city", "Алматы")
    limit    = min(int(data.get("limit", 6)), 12)

    # Получаем погоду если не передана
    temperature = data.get("temperature")
    weather     = data.get("weather")

    if temperature is None:
        weather_data = WeatherService.get_current(city)
        temperature  = weather_data.get("temp")
        if not weather:
            weather = weather_data.get("condition")

    # Запускаем rule-based рекомендации (L0)
    user_id = g.user.id if g.user else None
    items   = AIService.get_recommendations(
        activity=activity,
        temperature=temperature,
        weather=weather,
        user_id=user_id,
        limit=limit,
    )

    # Обогащаем через OpenAI GPT-4o-mini (L1)
    items = AIService.enrich_with_openai(items, activity, temperature, weather, city)

    return jsonify({
        "activity":    activity,
        "temperature": temperature,
        "weather":     weather,
        "city":        city,
        "items":       items,
    }), 200


@recommendations_bp.route("/recommendations/related", methods=["GET"])
def related_equipment():
    """
    Возвращает снаряжение, которое часто берут вместе.

    Алгоритм: находим бронирования, которые содержат данное снаряжение,
    и смотрим что ещё было в этих бронированиях.

    Query params:
        equipment_id — ID снаряжения
        limit        — количество результатов (по умолчанию 3)
    """
    eq_id = request.args.get("equipment_id", type=int)
    limit = request.args.get("limit", 3, type=int)

    if not eq_id:
        return jsonify([]), 200

    # Находим снаряжение, часто бронируемое вместе
    co_booked = (
        db.session.query(
            BookingItem.equipment_id,
            func.count("*").label("count")
        )
        .join(Booking)
        .filter(
            # Находим бронирования, содержащие целевое снаряжение
            Booking.id.in_(
                db.session.query(BookingItem.booking_id)
                .filter_by(equipment_id=eq_id)
            ),
            BookingItem.equipment_id != eq_id,
            Booking.status != "cancelled",
        )
        .group_by(BookingItem.equipment_id)
        .order_by(func.count("*").desc())
        .limit(limit)
        .all()
    )

    # Загружаем объекты снаряжения
    result = []
    for related_id, _ in co_booked:
        item = Equipment.query.get(related_id)
        if item and item.is_active:
            result.append(item.to_dict())

    # Дополняем из той же категории если мало результатов
    if len(result) < limit:
        target = Equipment.query.get(eq_id)
        if target and target.category_id:
            existing_ids = {r["id"] for r in result} | {eq_id}
            extra = (
                Equipment.query
                .filter(
                    Equipment.category_id == target.category_id,
                    Equipment.id.notin_(existing_ids),
                    Equipment.is_active == True,
                )
                .limit(limit - len(result))
                .all()
            )
            result.extend(e.to_dict() for e in extra)

    return jsonify(result), 200


@recommendations_bp.route("/ai/chat", methods=["POST"])
@optional_auth
def ai_chat():
    """
    AI чат-консультант по снаряжению (GPT-4o-mini).

    Принимает историю диалога и возвращает ответ AI-консультанта.
    AI знает каталог снаряжения и может давать конкретные рекомендации.

    Body: {
        "messages": [
            {"role": "user",      "content": "Что взять для лыж?"},
            {"role": "assistant", "content": "Рекомендую..."},
            {"role": "user",      "content": "А шлем нужен?"}
        ],
        "city": "Алматы"
    }

    Response: { "reply": "Да, шлем обязателен при горнолыжном катании..." }
    """
    data     = request.get_json() or {}
    messages = data.get("messages", [])
    city     = data.get("city", "Алматы")

    if not messages:
        return jsonify({"error": "Поле 'messages' обязательно"}), 400

    reply = AIService.chat(messages, city)
    return jsonify({"reply": reply}), 200


@recommendations_bp.route("/ai/suggest", methods=["POST"])
def ai_suggest():
    """
    Быстрый AI совет для конкретной активности.

    Используется виджетом на главной странице.
    Короткий одноразовый запрос без истории диалога.

    Body: {
        "activity":    "skiing",
        "city":        "Алматы",
        "temperature": -3    // необязательно
    }

    Response: { "suggestion": "Для лыж возьмите..." }
    """
    data        = request.get_json() or {}
    activity    = data.get("activity", "")
    city        = data.get("city", "Алматы")
    temperature = data.get("temperature")

    suggestion = AIService.suggest(activity, city, temperature)
    return jsonify({"suggestion": suggestion}), 200


# ─────────────────────────────────────────────────────────
# ЧАТ-БОТ ВИДЖЕТІ (сайт ассистенті)
# ─────────────────────────────────────────────────────────

@recommendations_bp.route("/chat/widget", methods=["POST"])
@optional_auth
def chat_widget():
    """
    Сайттың AI-ассистенті — чат виджеті үшін.

    Жабдық ұсыныстарынан айырмашылығы:
        - SITE_KNOWLEDGE (FAQ) арқылы сайт туралы жауап береді
        - Навигацияға, ережелерге, оплатаға жауап береді
        - Тарихты (messages) қабылдайды — контекстті ескереді

    Body: {
        "messages": [
            {"role": "user", "content": "Сколько стоит шлем?"}
        ],
        "locale": "ru"      // "ru" | "kk" | "en"
    }

    Response: {
        "reply":         "Шлем стоит 5 000 ₸/день...",
        "quick_replies": ["Что можно арендовать?", ...]
    }
    """
    data     = request.get_json() or {}
    messages = data.get("messages", [])
    locale   = data.get("locale", "ru")

    if not messages:
        return jsonify({"error": "messages обязательны"}), 400

    # Авторизацияланған пайдаланушының атын персонализация үшін аламыз
    user_name = g.user.name if g.user else None

    # ChatService арқылы жауап аламыз
    reply = ChatService.reply(messages, user_name=user_name, locale=locale)

    # Жылдам жауап батырмалары (UI үшін)
    quick_replies = ChatService.get_quick_replies(locale)

    return jsonify({
        "reply":         reply,
        "quick_replies": quick_replies,
    }), 200


@recommendations_bp.route("/chat/widget/start", methods=["GET"])
@optional_auth
def chat_widget_start():
    """
    Чат виджеті ашылғанда бірінші сәлемдесу хабарын алады.
    """
    locale    = request.args.get("locale", "ru")
    user_name = g.user.name if g.user else None

    greetings = {
        "ru": f"Привет{', ' + user_name if user_name else ''}! 👋 Я AI-ассистент PeakRent.kz. Помогу выбрать снаряжение, объясню как забронировать или отвечу на любой вопрос о нашем сервисе.",
        "kk": f"Сәлем{', ' + user_name if user_name else ''}! 👋 Мен PeakRent.kz сайтының AI-ассистентімін. Жабдық таңдауға, брондауға немесе кез-келген сұраққа көмектесемін.",
        "en": f"Hi{', ' + user_name if user_name else ''}! 👋 I'm the PeakRent.kz AI assistant. I can help you choose equipment, explain how to book, or answer any questions.",
    }

    return jsonify({
        "greeting":      greetings.get(locale, greetings["ru"]),
        "quick_replies": ChatService.get_quick_replies(locale),
    }), 200
