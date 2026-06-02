"""Recommendation and AI chat routes."""

from datetime import date

from flask import Blueprint, g, jsonify, request
from sqlalchemy import func

from ..extensions import db
from ..models import Booking, BookingItem, Equipment
from ..services.ai_service import AIService
from ..services.chat_service import ChatService
from ..services.weather_service import WeatherService
from ..utils.auth import optional_auth

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/recommendations", methods=["POST"])
@optional_auth
def recommendations():
    data = request.get_json() or {}
    activity = data.get("activity")
    city = data.get("city", "Алматы")
    level = data.get("level")
    locale = data.get("locale", "ru")
    limit = min(int(data.get("limit", 6)), 12)
    budget_max = data.get("budget_max")

    temperature = data.get("temperature")
    weather = data.get("weather")

    start_d = end_d = None
    try:
        if data.get("start_date"):
            start_d = date.fromisoformat(data["start_date"])
        if data.get("end_date"):
            end_d = date.fromisoformat(data["end_date"])
    except ValueError:
        start_d = end_d = None

    if temperature is None:
        weather_data = WeatherService.get_current(city)
        temperature = weather_data.get("temp")
        if not weather:
            weather = weather_data.get("condition")

    user_id = g.user.id if g.user else None
    items = AIService.get_recommendations(
        activity=activity,
        temperature=temperature,
        weather=weather,
        user_id=user_id,
        city=city,
        level=level,
        budget_max=int(budget_max) if budget_max not in (None, "") else None,
        start_date=start_d,
        end_date=end_d,
        locale=locale,
        limit=limit,
    )

    items = AIService.enrich_with_openai(items, activity, temperature, weather, city, locale)

    return (
        jsonify(
            {
                "activity": activity,
                "temperature": temperature,
                "weather": weather,
                "city": city,
                "level": level,
                "items": items,
            }
        ),
        200,
    )


@recommendations_bp.route("/recommendations/related", methods=["GET"])
def related_equipment():
    eq_id = request.args.get("equipment_id", type=int)
    limit = request.args.get("limit", 3, type=int)

    if not eq_id:
        return jsonify([]), 200

    co_booked = (
        db.session.query(BookingItem.equipment_id, func.count("*").label("count"))
        .join(Booking)
        .filter(
            Booking.id.in_(db.session.query(BookingItem.booking_id).filter_by(equipment_id=eq_id)),
            BookingItem.equipment_id != eq_id,
            Booking.status != "cancelled",
        )
        .group_by(BookingItem.equipment_id)
        .order_by(func.count("*").desc())
        .limit(limit)
        .all()
    )

    result = []
    for related_id, _ in co_booked:
        item = Equipment.query.get(related_id)
        if item and item.is_active:
            result.append(item.to_dict())

    if len(result) < limit:
        target = Equipment.query.get(eq_id)
        if target and target.category_id:
            existing_ids = {entry["id"] for entry in result} | {eq_id}
            extra = (
                Equipment.query.filter(
                    Equipment.category_id == target.category_id,
                    Equipment.id.notin_(existing_ids),
                    Equipment.is_active.is_(True),
                )
                .limit(limit - len(result))
                .all()
            )
            result.extend(item.to_dict() for item in extra)

    return jsonify(result), 200


@recommendations_bp.route("/ai/chat", methods=["POST"])
@optional_auth
def ai_chat():
    data = request.get_json() or {}
    messages = data.get("messages", [])
    city = data.get("city", "Алматы")
    locale = data.get("locale", "ru")

    if not messages:
        return jsonify({"error": "Поле 'messages' обязательно"}), 400

    reply = AIService.chat(messages, city, locale)
    return jsonify({"reply": reply}), 200


@recommendations_bp.route("/ai/suggest", methods=["POST"])
def ai_suggest():
    data = request.get_json() or {}
    activity = data.get("activity", "")
    city = data.get("city", "Алматы")
    temperature = data.get("temperature")
    locale = data.get("locale", "ru")

    suggestion = AIService.suggest(activity, city, temperature, locale)
    return jsonify({"suggestion": suggestion}), 200


@recommendations_bp.route("/chat/widget", methods=["POST"])
@optional_auth
def chat_widget():
    data = request.get_json() or {}
    messages = data.get("messages", [])
    locale = data.get("locale", "ru")

    if not messages:
        return jsonify({"error": "messages обязательны"}), 400

    user_name = g.user.name if g.user else None
    reply = ChatService.reply(messages, user_name=user_name, locale=locale)
    quick_replies = ChatService.get_quick_replies(locale)

    return jsonify({"reply": reply, "quick_replies": quick_replies}), 200


@recommendations_bp.route("/chat/widget/start", methods=["GET"])
@optional_auth
def chat_widget_start():
    locale = request.args.get("locale", "ru")
    user_name = g.user.name if g.user else None

    greetings = {
        "ru": f"Здравствуйте{', ' + user_name if user_name else ''}! Помогу с выбором снаряжения, бронированием и вопросами по сервису.",
        "kk": f"Сәлем{', ' + user_name if user_name else ''}! Жабдық таңдау, бронь және сервис бойынша көмектесемін.",
        "en": f"Hi{', ' + user_name if user_name else ''}! I can help with gear, booking, and service questions.",
    }

    return jsonify(
        {
            "greeting": greetings.get(locale, greetings["ru"]),
            "quick_replies": ChatService.get_quick_replies(locale),
        }
    ), 200
