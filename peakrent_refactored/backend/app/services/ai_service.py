"""AI recommendation and chat service for PeakRent."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timedelta

from flask import current_app
from sqlalchemy import func

from ..extensions import db
from ..models import Booking, BookingItem, Equipment

ACTIVITY_TAGS = {
    "skiing": ["skiing", "alpine", "winter", "helmet", "jacket", "thermal", "goggles"],
    "snowboard": ["snowboard", "winter", "helmet", "jacket", "thermal", "boots"],
    "hiking": ["hiking", "trekking", "boots", "backpack", "poles", "waterproof"],
    "camping": ["camping", "tent", "sleeping bag", "stove", "mat"],
    "climbing": ["climbing", "harness", "rope", "helmet", "carabiner", "safety"],
    "trekking": ["trekking", "hiking", "boots", "backpack", "poles", "multi-day"],
}

SAFETY_TAGS = {
    "skiing": ["helmet", "goggles", "thermal"],
    "snowboard": ["helmet", "thermal", "boots"],
    "hiking": ["boots", "waterproof", "poles"],
    "camping": ["tent", "sleeping bag"],
    "climbing": ["helmet", "harness", "rope", "safety"],
    "trekking": ["boots", "poles", "waterproof"],
}

LANGUAGE_NAMES = {"ru": "Russian", "kk": "Kazakh", "en": "English"}

FALLBACK_CHAT = {
    "ru": "Я помогу подобрать снаряжение из каталога PeakRent. Напишите активность, даты, уровень и бюджет.",
    "kk": "Мен PeakRent каталогынан жабдық таңдауға көмектесемін. Белсенділік, күндер, деңгей және бюджет жазыңыз.",
    "en": "I can help you pick gear from the PeakRent catalog. Tell me the activity, dates, level, and budget.",
}

SUGGEST_FALLBACKS = {
    "ru": {
        "skiing": "Для лыж советую комплект лыж, шлем и очки. Если холоднее -5°C, добавьте тёплый костюм.",
        "snowboard": "Для сноуборда возьмите доску с ботинками, шлем и тёплую куртку.",
        "hiking": "Для хайкинга подойдут треккинговые ботинки, рюкзак и палки.",
        "camping": "Для кемпинга начните с палатки, спальника и горелки.",
        "climbing": "Для альпинизма критично взять страховочную систему, верёвку и шлем.",
        "trekking": "Для треккинга лучше выбрать ботинки, рюкзак и палки.",
    },
    "kk": {
        "skiing": "Шаңғыға шаңғы жиынтығы, дулыға және көзілдірік керек. -5°C төмен болса жылы костюм қосыңыз.",
        "snowboard": "Сноубордқа тақта, ботинка, дулыға және жылы күрте керек.",
        "hiking": "Хайкингке треккинг ботинкасы, рюкзак және таяқша қолайлы.",
        "camping": "Кемпингке шатыр, ұйқы қапы және жанарғыдан бастаңыз.",
        "climbing": "Альпинизмге сақтандыру жүйесі, арқан және дулыға міндетті.",
        "trekking": "Треккингке ботинка, рюкзак және таяқша таңдаған дұрыс.",
    },
    "en": {
        "skiing": "For skiing, start with a ski set, helmet, and goggles. Add warm outerwear below -5°C.",
        "snowboard": "For snowboarding, take a board set, helmet, and insulated jacket.",
        "hiking": "For hiking, trekking boots, a backpack, and poles are a solid base.",
        "camping": "For camping, begin with a tent, sleeping bag, and stove.",
        "climbing": "For climbing, a harness, rope, and helmet are essential.",
        "trekking": "For trekking, pick boots, a backpack, and poles.",
    },
}


class AIService:
    @staticmethod
    def get_recommendations(
        activity: str | None = None,
        temperature: float | None = None,
        weather: str | None = None,
        user_id: int | None = None,
        city: str | None = None,
        level: str | None = None,
        budget_max: int | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        locale: str = "ru",
        limit: int = 6,
    ) -> list:
        all_equipment = Equipment.query.filter_by(is_active=True).all()
        if not all_equipment:
            return []

        target_tags = AIService._build_target_tags(activity, temperature, weather, level)
        context_label = AIService._build_context_label(activity, city, weather, temperature, locale)

        cutoff = datetime.utcnow() - timedelta(days=30)
        popularity_map = dict(
            db.session.query(BookingItem.equipment_id, func.sum(BookingItem.quantity))
            .join(Booking)
            .filter(Booking.created_at >= cutoff, Booking.status != "cancelled")
            .group_by(BookingItem.equipment_id)
            .all()
        )
        max_popularity = max(popularity_map.values(), default=1) or 1

        recently_rented = set()
        if user_id:
            recent_rows = (
                BookingItem.query.join(Booking)
                .filter(
                    Booking.user_id == user_id,
                    Booking.created_at >= datetime.utcnow() - timedelta(days=14),
                )
                .with_entities(BookingItem.equipment_id)
                .all()
            )
            recently_rented = {row[0] for row in recent_rows}

        current_month = datetime.utcnow().month
        scored_items = []

        for item in all_equipment:
            available_units = item.available_stock(start_date, end_date) if start_date and end_date else item.stock
            if available_units <= 0:
                continue

            item_tags = set(tag.strip().lower() for tag in json.loads(item.tags or "[]"))

            if target_tags:
                tag_overlap = len(item_tags & target_tags) / max(len(target_tags), 1)
            else:
                tag_overlap = 0.35

            popularity_score = popularity_map.get(item.id, 0) / max_popularity
            seasonal_bonus = 0.15 if current_month in json.loads(item.peak_months or "[]") else 0.0
            featured_bonus = 0.05 if item.is_featured else 0.0
            history_penalty = 0.25 if item.id in recently_rented else 0.0
            stock_bonus = min(available_units / max(item.stock, 1), 1.0) * 0.08
            safety_bonus = 0.08 if activity and AIService._is_safety_item(activity, item_tags) else 0.0
            budget_penalty = 0.0
            if budget_max and item.price_per_day > budget_max:
                budget_penalty = min((item.price_per_day - budget_max) / max(budget_max, 1), 1.0) * 0.20

            score = (
                tag_overlap * 0.52
                + popularity_score * 0.18
                + seasonal_bonus * 0.08
                + featured_bonus * 0.04
                + stock_bonus
                + safety_bonus
                - history_penalty
                - budget_penalty
            )

            if score <= 0.03:
                continue

            result = item.to_dict(start_date, end_date)
            result["score"] = round(score, 3)
            result["recommendation_reason"] = AIService._fallback_reason(
                item=item,
                item_tags=item_tags,
                available_units=available_units,
                context_label=context_label,
                activity=activity,
                locale=locale,
            )
            scored_items.append(result)

        scored_items.sort(key=lambda entry: entry["score"], reverse=True)
        return scored_items[:limit]

    @staticmethod
    def enrich_with_openai(
        items: list,
        activity: str | None,
        temperature: float | None,
        weather: str | None,
        city: str | None,
        locale: str = "ru",
    ) -> list:
        client = AIService._get_openai_client()
        if not client or not items:
            return items

        payload = [
            {
                "name": item.get("name_ru"),
                "price_per_day": item.get("price_per_day"),
                "stock": item.get("stock"),
                "tags": item.get("tags", [])[:4],
            }
            for item in items[:6]
        ]

        prompt = (
            "You are a rental equipment advisor for PeakRent.kz.\n"
            f"Reply in {LANGUAGE_NAMES.get(locale, 'Russian')}.\n"
            "Use only the provided catalog items. Do not invent unavailable products.\n"
            "For each item write exactly one short sentence with:\n"
            "1) why it fits today's conditions,\n"
            "2) one safety or comfort hint,\n"
            "3) one next-step action.\n"
            "Keep every sentence under 130 characters.\n"
            f"Context: activity={activity or 'not specified'}, city={city or 'Almaty'}, weather={weather or 'unknown'}, temperature={temperature if temperature is not None else 'unknown'}.\n"
            f"Items: {json.dumps(payload, ensure_ascii=False)}\n"
            'Return JSON array only, like ["...", "..."].'
        )

        try:
            response = client.chat.completions.create(
                model=current_app.config["OPENAI_MODEL"],
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.45,
                timeout=10,
            )
            raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
            reasons = json.loads(raw)
            if isinstance(reasons, list):
                for index, item in enumerate(items):
                    if index < len(reasons) and isinstance(reasons[index], str):
                        item["recommendation_reason"] = reasons[index]
        except Exception as exc:
            current_app.logger.warning(f"OpenAI enrich failed: {exc}")

        return items

    @staticmethod
    def chat(messages: list, city: str = "Алматы", locale: str = "ru") -> str:
        client = AIService._get_openai_client()
        if not client:
            return FALLBACK_CHAT.get(locale, FALLBACK_CHAT["ru"])

        recent_messages = messages[-10:]
        profile = AIService._extract_chat_context(recent_messages)
        catalog_context = AIService._catalog_context(city)

        system_prompt = (
            "You are PeakRent.kz AI rental advisor.\n"
            f"Always reply in {LANGUAGE_NAMES.get(locale, 'Russian')}.\n"
            "You must only recommend gear that exists in the provided catalog context.\n"
            "If the user has not shared enough details, ask concise follow-up questions about:\n"
            "- activity\n- skill level\n- rental dates\n- budget\n"
            "When enough details exist:\n"
            "- recommend real catalog items only\n"
            "- prefer currently available items\n"
            "- include one safety tip\n"
            "- include one concrete next action (open catalog, book, choose dates)\n"
            "- do not invent inventory, prices, or services\n"
            "- be concise: 3-5 short sentences\n"
            f"Known user context: {json.dumps(profile, ensure_ascii=False)}\n"
            f"Catalog context: {json.dumps(catalog_context, ensure_ascii=False)}"
        )

        return AIService._openai_chat(recent_messages, system_prompt) or FALLBACK_CHAT.get(locale, FALLBACK_CHAT["ru"])

    @staticmethod
    def suggest(
        activity: str,
        city: str = "Алматы",
        temperature: float | None = None,
        locale: str = "ru",
    ) -> str:
        prompt = (
            f"Reply in {LANGUAGE_NAMES.get(locale, 'Russian')}.\n"
            f"Give a short 3-sentence rental tip for {activity} in {city}. "
            f"{'Temperature is ' + str(temperature) + 'C. ' if temperature is not None else ''}"
            "Mention only realistic gear categories, one safety tip, and one next step."
        )
        result = AIService._openai_chat([{"role": "user", "content": prompt}])
        if result:
            return result
        return SUGGEST_FALLBACKS.get(locale, SUGGEST_FALLBACKS["ru"]).get(
            activity, FALLBACK_CHAT.get(locale, FALLBACK_CHAT["ru"])
        )

    @staticmethod
    def _build_target_tags(
        activity: str | None,
        temperature: float | None,
        weather: str | None,
        level: str | None,
    ) -> set:
        tags = set()
        if activity:
            tags.update(ACTIVITY_TAGS.get(activity.lower(), []))

        if temperature is not None:
            if temperature < 0:
                tags.update(["thermal", "winter", "jacket"])
            elif temperature < 10:
                tags.update(["waterproof", "jacket"])

        if weather:
            lowered = weather.lower()
            if "snow" in lowered:
                tags.update(["winter", "thermal", "goggles"])
            elif "rain" in lowered:
                tags.update(["waterproof", "tent", "jacket"])

        if level == "beginner":
            tags.update(["beginner-friendly", "safety"])
        elif level == "advanced":
            tags.update(["performance", "expedition"])

        return tags

    @staticmethod
    def _build_context_label(
        activity: str | None,
        city: str | None,
        weather: str | None,
        temperature: float | None,
        locale: str,
    ) -> str:
        parts = []
        if activity:
            parts.append(activity)
        if city:
            parts.append(city)
        if weather:
            parts.append(weather)
        if temperature is not None:
            if locale == "kk":
                parts.append(f"{temperature:.0f}°C")
            else:
                parts.append(f"{temperature:.0f}°C")
        return " · ".join(parts)

    @staticmethod
    def _fallback_reason(item: Equipment, item_tags: set, available_units: int, context_label: str, activity: str | None, locale: str) -> str:
        safety_match = AIService._is_safety_item(activity, item_tags) if activity else False
        if locale == "kk":
            prefix = f"{context_label} үшін жақсы сәйкеседі." if context_label else "Бұл позиция сұранысқа жақсы сәйкеседі."
            safety = " Қауіпсіздік үшін маңызды." if safety_match else ""
            action = f" Қазір {available_units} дана бос, күнін таңдап брондаңыз."
            return f"{prefix}{safety}{action}"
        if locale == "en":
            prefix = f"Good fit for {context_label}." if context_label else "Good match for your request."
            safety = " Useful for safety." if safety_match else ""
            action = f" {available_units} unit(s) are available now, so you can book dates next."
            return f"{prefix}{safety}{action}"
        prefix = f"Хорошо подходит для {context_label}." if context_label else "Хорошо подходит под ваш запрос."
        safety = " Важный элемент для безопасности." if safety_match else ""
        action = f" Сейчас доступно {available_units} шт., можно сразу выбрать даты."
        return f"{prefix}{safety}{action}"

    @staticmethod
    def _is_safety_item(activity: str | None, item_tags: set) -> bool:
        if not activity:
            return False
        return any(tag in item_tags for tag in SAFETY_TAGS.get(activity.lower(), []))

    @staticmethod
    def _extract_chat_context(messages: list) -> dict:
        joined = " ".join(message.get("content", "") for message in messages if message.get("role") == "user").lower()

        activity = None
        for key in ACTIVITY_TAGS:
            if key in joined:
                activity = key
                break
        if "лыж" in joined or "шаңғы" in joined:
            activity = activity or "skiing"
        if "сноуб" in joined:
            activity = activity or "snowboard"
        if "хайк" in joined or "hiking" in joined:
            activity = activity or "hiking"
        if "кемп" in joined or "camp" in joined:
            activity = activity or "camping"
        if "альп" in joined or "climb" in joined:
            activity = activity or "climbing"
        if "трек" in joined:
            activity = activity or "trekking"

        level = None
        if any(word in joined for word in ["beginner", "нович", "бастау"]):
            level = "beginner"
        elif any(word in joined for word in ["advanced", "опыт", "жетік", "pro"]):
            level = "advanced"

        budget_match = re.search(r"(\d{4,6})", joined)
        budget = int(budget_match.group(1)) if budget_match else None

        return {
            "activity": activity,
            "level": level,
            "budget": budget,
            "mentions_dates": any(token in joined for token in ["день", "дня", "күн", "day", "date"]),
        }

    @staticmethod
    def _catalog_context(city: str) -> list:
        items = Equipment.query.filter_by(is_active=True).limit(20).all()
        result = []
        for item in items:
            result.append(
                {
                    "name": item.name_ru,
                    "slug": item.slug,
                    "price_per_day": item.price_per_day,
                    "stock": item.stock,
                    "tags": json.loads(item.tags or "[]")[:4],
                    "city_context": city,
                }
            )
        return result

    @staticmethod
    def _get_openai_client():
        try:
            from openai import OpenAI

            api_key = current_app.config.get("OPENAI_API_KEY", "")
            if not api_key:
                return None
            return OpenAI(api_key=api_key)
        except ImportError:
            current_app.logger.warning("openai package is not installed")
            return None

    @staticmethod
    def _openai_chat(messages: list, system: str | None = None) -> str | None:
        client = AIService._get_openai_client()
        if not client:
            return None

        full_messages = []
        if system:
            full_messages.append({"role": "system", "content": system})
        full_messages.extend(messages)

        try:
            response = client.chat.completions.create(
                model=current_app.config["OPENAI_MODEL"],
                messages=full_messages,
                max_tokens=700,
                temperature=0.55,
                timeout=15,
            )
            return response.choices[0].message.content
        except Exception as exc:
            current_app.logger.warning(f"OpenAI chat failed: {exc}")
            return None
