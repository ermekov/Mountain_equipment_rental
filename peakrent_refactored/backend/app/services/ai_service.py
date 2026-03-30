"""
app/services/ai_service.py — AI сервис рекомендаций

Двухуровневая архитектура AI:

    Уровень 1 (L0): Правиловый движок (Rule-Based Engine)
        - Скорость: < 50ms
        - Не требует внешних API
        - Формула скоринга:
            score = tag_overlap * 0.60   ← совпадение тегов активности
                  + popularity  * 0.25   ← частота бронирований за 30 дней
                  + seasonal    * 0.10   ← пиковый сезон для снаряжения
                  + featured    * 0.05   ← бонус за рекомендованность
                  - history_pen          ← штраф за недавно арендованное

    Уровень 2 (L1): OpenAI GPT-4o-mini
        - Скорость: 1–3 секунды
        - Обогащает L0 результаты персональными объяснениями
        - Используется ТОЛЬКО для текста, не для отбора снаряжения
        - Fallback: если OpenAI недоступен → используем L0 объяснения

Такая архитектура обеспечивает:
    ✅ Быстрый ответ (L0 всегда работает)
    ✅ Персональные объяснения (L1 когда доступен)
    ✅ Отказоустойчивость (работает без интернета)
"""

import json
from datetime import datetime, timedelta

from sqlalchemy import func
from flask import current_app

from ..extensions import db
from ..models import Equipment, Booking, BookingItem

# Маппинг активностей → теги снаряжения
# Определяет какое снаряжение показывать для каждой активности
ACTIVITY_TAGS = {
    "skiing":    ["skiing", "alpine", "winter", "helmet", "jacket", "thermal", "goggles"],
    "snowboard": ["snowboard", "winter", "helmet", "jacket", "thermal", "boots"],
    "hiking":    ["hiking", "trekking", "boots", "backpack", "poles", "waterproof"],
    "camping":   ["camping", "tent", "sleeping bag", "stove", "mat"],
    "climbing":  ["climbing", "harness", "rope", "helmet", "carabiner", "safety"],
    "trekking":  ["trekking", "hiking", "boots", "backpack", "poles", "multi-day"],
}


class AIService:
    """
    Сервис AI-рекомендаций.

    Содержит всю бизнес-логику для подбора снаряжения:
        - Rule-based скоринг (L0)
        - Обогащение через OpenAI (L1)
        - AI чат-консультант
    """

    @staticmethod
    def get_recommendations(
        activity: str = None,
        temperature: float = None,
        weather: str = None,
        user_id: int = None,
        limit: int = 6,
    ) -> list:
        """
        Возвращает персональные рекомендации снаряжения.

        Алгоритм:
            1. Строим множество целевых тегов из активности и погоды
            2. Вычисляем скор для каждой единицы снаряжения
            3. Сортируем по убыванию скора
            4. Возвращаем топ-N результатов

        Args:
            activity:    тип активности ("skiing", "hiking", etc.)
            temperature: температура воздуха в °C
            weather:     описание погоды ("snow", "rain", etc.)
            user_id:     ID пользователя (для исключения недавно арендованного)
            limit:       максимальное количество результатов

        Returns:
            list: список словарей с полями снаряжения + recommendation_reason + score
        """
        all_equipment = Equipment.query.filter_by(is_active=True).all()
        if not all_equipment:
            return []

        # ── Шаг 1: Формируем целевое множество тегов ─────────────────────────
        target_tags = set()
        context_parts = []  # Для генерации объяснений

        if activity:
            mapped_tags = ACTIVITY_TAGS.get(activity.lower(), [])
            target_tags.update(mapped_tags)
            context_parts.append(activity)

        # Корректируем теги на основе температуры
        if temperature is not None:
            if temperature < 5:
                target_tags.update(["thermal", "winter", "jacket"])
                context_parts.append(f"{temperature:.0f}°C")
            elif temperature < 15:
                target_tags.update(["hiking", "waterproof"])

        # Корректируем теги на основе погодных условий
        if weather:
            w = weather.lower()
            if "snow" in w:
                target_tags.update(["skiing", "snowboard", "thermal"])
            elif "rain" in w:
                target_tags.update(["waterproof", "tent", "jacket"])

        base_context = " · ".join(context_parts) if context_parts else ""

        # ── Шаг 2: Получаем данные популярности (за последние 30 дней) ───────
        cutoff = datetime.utcnow() - timedelta(days=30)
        popularity_map = dict(
            db.session.query(
                BookingItem.equipment_id,
                func.sum(BookingItem.quantity)
            )
            .join(Booking)
            .filter(
                Booking.created_at >= cutoff,
                Booking.status != "cancelled"
            )
            .group_by(BookingItem.equipment_id)
            .all()
        )
        max_popularity = max(popularity_map.values(), default=1) or 1

        # ── Шаг 3: Определяем что пользователь недавно арендовал ─────────────
        current_month = datetime.utcnow().month
        recently_rented = set()
        if user_id:
            recent_rows = (
                BookingItem.query
                .join(Booking)
                .filter(
                    Booking.user_id == user_id,
                    Booking.created_at >= datetime.utcnow() - timedelta(days=14),
                )
                .with_entities(BookingItem.equipment_id)
                .all()
            )
            recently_rented = {row[0] for row in recent_rows}

        # ── Шаг 4: Вычисляем скор для каждой единицы снаряжения ──────────────
        scored_items = []

        for item in all_equipment:
            item_tags = set(t.strip().lower() for t in json.loads(item.tags or "[]"))

            # Компонента 1: Пересечение тегов (60% веса)
            if target_tags:
                tag_overlap = len(item_tags & target_tags) / max(len(target_tags), 1)
            else:
                tag_overlap = 0.5  # Без активности — равновероятно

            # Компонента 2: Популярность (25% веса)
            popularity_score = popularity_map.get(item.id, 0) / max_popularity

            # Компонента 3: Сезонность (10% веса)
            peak_months = json.loads(item.peak_months or "[]")
            seasonal_bonus = 0.15 if current_month in peak_months else 0.0

            # Компонента 4: Рекомендованность (5% веса)
            featured_bonus = 0.05 if item.is_featured else 0.0

            # Штраф за историю аренды
            history_penalty = 0.30 if item.id in recently_rented else 0.0

            # Итоговый скор
            score = (
                tag_overlap      * 0.60
                + popularity_score * 0.25
                + seasonal_bonus   * 0.10
                + featured_bonus   * 0.05
                - history_penalty
            )

            # Фильтруем нерелевантные результаты
            if score <= 0.02:
                continue

            # Генерируем базовое объяснение
            if tag_overlap > 0.4:
                reason = f"Отлично подходит для {base_context}" if base_context else "Популярный выбор"
            elif tag_overlap > 0.15:
                reason = f"Хорошо подойдёт для {base_context}" if base_context else "Рекомендуем"
            else:
                reason = "Популярно среди арендаторов"

            result = item.to_dict()
            result["recommendation_reason"] = reason
            result["score"] = round(score, 3)
            scored_items.append(result)

        # Сортируем по убыванию скора
        scored_items.sort(key=lambda x: x["score"], reverse=True)
        return scored_items[:limit]

    @staticmethod
    def enrich_with_openai(
        items: list,
        activity: str,
        temperature: float,
        weather: str,
        city: str,
    ) -> list:
        """
        Обогащает рекомендации персональными объяснениями через GPT-4o-mini.

        Отправляет список снаряжения в OpenAI и просит написать
        персонализированное объяснение для каждой позиции.

        Args:
            items:       список рекомендаций от rule-based движка
            activity:    активность пользователя
            temperature: температура
            weather:     погода
            city:        город

        Returns:
            list: обновлённый список с улучшенными recommendation_reason
        """
        client = AIService._get_openai_client()
        if not client or not items:
            return items  # Fallback: возвращаем L0 результаты

        # Составляем краткое описание снаряжения для запроса
        items_summary = [
            {
                "name": item.get("name_ru", ""),
                "tags": item.get("tags", [])[:3],
            }
            for item in items[:6]
        ]

        prompt = (
            f"Ты консультант по аренде горного снаряжения PeakRent.kz в Алматы.\n"
            f"Активность: {activity or 'горный отдых'}. "
            f"Погода в {city or 'Алматы'}: "
            f"{f'{temperature:.0f}°C' if temperature is not None else 'неизвестно'}, "
            f"{weather or ''}.\n"
            f"Для каждой позиции напиши объяснение (1 предложение, до 90 символов) ПОЧЕМУ она нужна.\n"
            f"По-русски, конкретно. Снаряжение:\n{json.dumps(items_summary, ensure_ascii=False)}\n"
            f"Ответь ТОЛЬКО JSON-массивом строк (reasons). Без других слов."
        )

        try:
            response = client.chat.completions.create(
                model=current_app.config["OPENAI_MODEL"],
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.7,
                timeout=8,
            )
            raw = response.choices[0].message.content.strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            reasons = json.loads(raw)

            if isinstance(reasons, list):
                for i, item in enumerate(items):
                    if i < len(reasons):
                        item["recommendation_reason"] = reasons[i]

        except Exception as e:
            current_app.logger.warning(f"OpenAI enrich failed: {e}")
            # Fallback: используем L0 объяснения (уже заполнены)

        return items

    @staticmethod
    def chat(messages: list, city: str = "Алматы") -> str:
        """
        AI чат-консультант по снаряжению.

        Использует контекст каталога снаряжения для ответов.
        Если OpenAI недоступен — возвращает приветственное сообщение.

        Args:
            messages: история сообщений [{"role": "user", "content": "..."}]
            city:     город пользователя

        Returns:
            str: ответ AI-консультанта
        """
        client = AIService._get_openai_client()
        if not client:
            return "Привет! Я консультант PeakRent.kz. Расскажите о вашей активности — подберу снаряжение!"

        # Получаем краткий каталог для контекста
        catalog = [
            {
                "name":  eq.name_ru,
                "price": eq.price_per_day,
                "tags":  json.loads(eq.tags or "[]")[:3],
            }
            for eq in Equipment.query.filter_by(is_active=True).limit(20).all()
        ]

        system_prompt = (
            f"Ты AI-консультант по аренде горного снаряжения PeakRent.kz в Алматы. "
            f"Помогаешь с выбором снаряжения: лыжи, сноуборд, хайкинг, кемпинг, альпинизм. "
            f"Отвечай по-русски кратко (до 150 слов). "
            f"Курорты: Шымбулак, Ой-Қарағай. Оплата: Kaspi QR. "
            f"Каталог: {json.dumps(catalog, ensure_ascii=False)}"
        )

        return AIService._openai_chat(messages, system_prompt)

    @staticmethod
    def suggest(activity: str, city: str = "Алматы", temperature: float = None) -> str:
        """
        Быстрый AI-совет по снаряжению для конкретной активности.

        Args:
            activity:    активность ("skiing", "hiking", etc.)
            city:        город
            temperature: температура

        Returns:
            str: короткий совет по снаряжению
        """
        prompt = (
            f"Дай краткий совет (3 предложения) по снаряжению для {activity} в {city}. "
            f"{'Температура: ' + str(temperature) + '°C.' if temperature else ''} "
            f"Упомяни 2–3 конкретных позиции. По-русски."
        )

        result = AIService._openai_chat(
            [{"role": "user", "content": prompt}]
        )

        if not result:
            # Заготовленные fallback-ответы
            fallbacks = {
                "skiing":    "Для лыж возьмите: горнолыжный комплект, шлем и очки. При морозе ниже -5°C добавьте термобельё.",
                "snowboard": "Для сноуборда: доска с ботинками, шлем и тёплые перчатки.",
                "hiking":    "Для хайкинга: треккинговые ботинки, рюкзак 30–40L и треккинговые палки.",
                "camping":   "Для кемпинга: 4-сезонная палатка, спальник до -10°C и газовая горелка.",
                "climbing":  "Для альпинизма: страховочная система, верёвка 60м и шлем.",
                "trekking":  "Для треккинга: рюкзак 60L, водонепроницаемые ботинки и треккинговые палки.",
            }
            return fallbacks.get(activity, "Выберите активность — подберём снаряжение!")

        return result

    # ── Приватные вспомогательные методы ─────────────────────────────────────

    @staticmethod
    def _get_openai_client():
        """Возвращает OpenAI клиент или None если не настроен."""
        try:
            from openai import OpenAI
            api_key = current_app.config.get("OPENAI_API_KEY", "")
            if not api_key:
                return None
            return OpenAI(api_key=api_key)
        except ImportError:
            current_app.logger.warning("openai пакет не установлен")
            return None

    @staticmethod
    def _openai_chat(messages: list, system: str = None) -> str:
        """Отправляет запрос в OpenAI Chat API."""
        client = AIService._get_openai_client()
        if not client:
            return None

        # Формируем список сообщений с системным промптом
        full_messages = []
        if system:
            full_messages.append({"role": "system", "content": system})
        full_messages.extend(messages)

        try:
            response = client.chat.completions.create(
                model=current_app.config["OPENAI_MODEL"],
                messages=full_messages,
                max_tokens=600,
                temperature=0.7,
                timeout=15,
            )
            return response.choices[0].message.content
        except Exception as e:
            current_app.logger.warning(f"OpenAI chat failed: {e}")
            return None
