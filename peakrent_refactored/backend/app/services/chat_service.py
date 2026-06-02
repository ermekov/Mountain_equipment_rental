"""Site assistant chat service."""

import json
import re
from datetime import date, datetime

from flask import current_app

from ..models import Equipment

SITE_KNOWLEDGE = {
    "company": """
- PeakRent.kz - rental platform for mountain gear in Almaty
- Address: Dostyk 123, Almaty
- Hours: daily from 08:00 to 22:00
- Phone: +7 (707) 123-45-67
- Email: hello@peakrent.kz
- Main resorts: Shymbulak, Oi-Qaragai, Ak-Bulak
""",
    "catalog": """
- /catalog - browse all gear and use filters
- /equipment/[slug] - product details and booking
- /ai - AI recommendations page
- /checkout - payment and booking checkout
- /profile - booking history and statuses
""",
    "payments": """
- Payment methods: Kaspi QR, card, cash
- Deposit depends on equipment and is returned after safe return
- Booking can be cancelled while pending or confirmed
""",
    "rules": """
- Minimum rental period: 1 day
- Gear should be returned clean and undamaged
- Helmet is strongly recommended for skiing and snowboarding
- For climbing safety gear is mandatory
""",
}

QUICK_REPLIES = {
    "ru": [
        "Что можно арендовать?",
        "Как забронировать?",
        "Какие есть цены?",
        "Как оплатить?",
        "Где забрать заказ?",
    ],
    "kk": [
        "Не жалдауға болады?",
        "Қалай брондауға болады?",
        "Бағалар қандай?",
        "Қалай төлеуге болады?",
        "Қайдан алып кетемін?",
    ],
    "en": [
        "What can I rent?",
        "How do I book?",
        "What are the prices?",
        "How can I pay?",
        "Where do I pick up?",
    ],
}

FALLBACKS = {
    "ru": "Я помогу по сайту PeakRent.kz: каталог, бронь, оплата, выдача и базовые советы по снаряжению.",
    "kk": "Мен PeakRent.kz сайты бойынша көмектесемін: каталог, бронь, төлем, алу және жабдық туралы базалық кеңес.",
    "en": "I can help with PeakRent.kz: catalog, booking, payment, pickup, and basic gear guidance.",
}

BRAND_KEYWORDS = [
    "keen",
    "marmot",
    "msr",
    "outventure",
    "the north face",
    "north face",
    "vento",
    "volkl",
    "volokl",
    "head",
    "lamost",
]

CATEGORY_KEYWORDS = {
    "helmet": ["\u0448\u043b\u0435\u043c", "helmet", "\u0434\u0443\u043b\u044b\u0493\u0430"],
    "jacket": ["\u043a\u0443\u0440\u0442\u043a", "jacket", "\u043a\u04af\u0440\u0442", "\u0448\u0442\u0430\u043d", "pants"],
    "boots": ["\u0431\u043e\u0442\u0438\u043d", "boots", "\u0435\u0442\u0456\u043a"],
    "skiing": ["\u043b\u044b\u0436", "ski", "\u0448\u0430\u04a3\u0493\u044b"],
    "snowboard": ["\u0441\u043d\u043e\u0443\u0431\u043e\u0440\u0434", "snowboard"],
    "tent": ["\u043f\u0430\u043b\u0430\u0442", "tent", "\u0448\u0430\u0442\u044b\u0440"],
    "backpack": ["\u0440\u044e\u043a\u0437\u0430\u043a", "backpack", "\u0441\u04e9\u043c\u043a\u0435"],
    "rope": ["\u0432\u0435\u0440\u0435\u0432", "rope", "\u0430\u0440\u049b\u0430\u043d"],
}


def build_system_prompt(user_name: str | None = None, locale: str = "ru", catalog_context: list | None = None) -> str:
    language = {"ru": "Russian", "kk": "Kazakh", "en": "English"}.get(locale, "Russian")
    knowledge = "\n".join(SITE_KNOWLEDGE.values())
    user_line = f"User name: {user_name}. " if user_name else ""
    catalog_line = json.dumps(catalog_context or [], ensure_ascii=False)
    return (
        "You are the online chat for PeakRent.kz.\n"
        f"{user_line}Reply in {language}.\n"
        "Your role:\n"
        "- answer service and navigation questions naturally\n"
        "- help users move to the right section when needed\n"
        "- answer using the real catalog context when products are mentioned\n"
        "- give concise rental guidance without inventing facts\n"
        "- mention sections naturally, for example 'in the catalog' or 'in AI picks'\n"
        "- when you point to a section, format it as a markdown link like [каталог](/catalog) or [AI-подбор](/ai)\n"
        "Rules:\n"
        "- answer in 2-4 short sentences\n"
        "- use only the knowledge and catalog below\n"
        "- do not invent products, brands, sizes, prices, or stock\n"
        "- when asked about products, mention only items from the catalog context\n"
        "- if information is missing, say to contact +7 (707) 123-45-67\n"
        "- include one clear next action when useful\n"
        f"Knowledge:\n{knowledge}\n"
        f"Catalog context:\n{catalog_line}"
    )


class ChatService:
    @staticmethod
    def reply(messages: list, user_name: str | None = None, locale: str = "ru") -> str:
        try:
            from openai import OpenAI
            from .ai_service import AIService

            api_key = current_app.config.get("OPENAI_API_KEY", "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")
            if not api_key:
                return ChatService._fallback(messages, locale)

            client = OpenAI(api_key=api_key)
            recent_messages = messages[-10:]
            user_text = " ".join(message.get("content", "") for message in recent_messages if message.get("role") == "user")
            if ChatService._is_advice_question(user_text):
                ai_reply = AIService.chat(recent_messages, "Алматы", locale)
                if ai_reply:
                    return ai_reply
            catalog_context = ChatService._catalog_context(user_text, limit=18)
            catalog_answer = ChatService._build_catalog_answer(user_text, catalog_context, locale)
            if catalog_answer:
                return catalog_answer
            full_messages = [{"role": "system", "content": build_system_prompt(user_name, locale, catalog_context)}] + recent_messages

            response = client.chat.completions.create(
                model=current_app.config.get("OPENAI_MODEL", "gpt-4o-mini"),
                messages=full_messages,
                max_completion_tokens=450,
                temperature=0.45,
                timeout=15,
            )
            return response.choices[0].message.content
        except Exception as exc:
            current_app.logger.warning(f"ChatService error: {exc}")
            return ChatService._fallback(messages, locale)

    @staticmethod
    def _fallback(messages: list, locale: str) -> str:
        last = messages[-1]["content"].lower() if messages else ""

        if any(word in last for word in ["цена", "price", "баға", "сколько"]):
            if locale == "kk":
                return "Бағаларды каталогтан көре аласыз: /catalog. Нақты жабдық пен күнге қарай сома автоматты есептеледі."
            if locale == "en":
                return "You can check prices in /catalog. The final amount is calculated automatically based on gear and dates."
            return "Цены можно посмотреть в /catalog. Итоговая сумма считается автоматически по выбранным датам и снаряжению."

        if any(word in last for word in ["бронь", "book", "бронд", "жалдау"]):
            if locale == "kk":
                return "Алдымен /catalog не /ai бетінде жабдық таңдаңыз, сосын күндерді белгілеп checkout арқылы төлеңіз."
            if locale == "en":
                return "Choose gear in /catalog or /ai first, then set dates and complete checkout."
            return "Сначала выберите снаряжение в /catalog или /ai, затем укажите даты и завершите checkout."

        if any(word in last for word in ["оплат", "kaspi", "төле", "pay"]):
            if locale == "kk":
                return "Төлем Kaspi QR, карта немесе қолма-қол арқылы жасалады. Жылдам жол керек болса, Kaspi QR таңдаңыз."
            if locale == "en":
                return "You can pay by Kaspi QR, card, or cash. For the fastest flow, use Kaspi QR."
            return "Оплата доступна через Kaspi QR, карту или наличными. Для самого быстрого сценария используйте Kaspi QR."

        return FALLBACKS.get(locale, FALLBACKS["ru"])

    @staticmethod
    def get_quick_replies(locale: str = "ru") -> list:
        return QUICK_REPLIES.get(locale, QUICK_REPLIES["ru"])

    @staticmethod
    def _catalog_context(query_text: str | None, limit: int = 18) -> list:
        prefs = ChatService._extract_preferences(query_text)
        query_terms = {
            token.strip().lower()
            for token in re.split(r"[^a-zA-Zа-яА-Яәіңғүұқөһ0-9]+", query_text or "")
            if len(token.strip()) >= 3
        }

        scored_items = []
        for item in Equipment.query.filter_by(is_active=True).all():
            tags = [tag.strip().lower() for tag in json.loads(item.tags or "[]")]
            descriptions = " ".join(filter(None, [item.description_ru, item.description_kk, item.description_en]))
            haystack = " ".join(
                filter(
                    None,
                    [
                        item.name_ru,
                        item.name_kk,
                        item.name_en,
                        descriptions,
                        item.category.name_ru if item.category else "",
                        item.category.slug if item.category else "",
                        " ".join(tags),
                    ],
                )
            ).lower()

            stock_value = (
                item.available_stock(prefs["start_date"], prefs["end_date"])
                if prefs["start_date"] and prefs["end_date"]
                else item.stock
            )
            score = 1 if item.is_featured else 0
            if query_terms:
                score += sum(2 for term in query_terms if term in haystack)
            if prefs["gender"] and (item.gender or "unisex") == prefs["gender"]:
                score += 8
            elif prefs["gender"] and (item.gender or "unisex") == "unisex":
                score += 3
            if prefs["brand"] and prefs["brand"] in haystack:
                score += 10
            if prefs["size"] and ChatService._size_matches(item, prefs["size"]):
                score += 7
            if prefs["budget_max"] is not None and item.price_per_day <= prefs["budget_max"]:
                score += 5
            elif prefs["budget_max"] is not None:
                score -= 4
            for keyword_group, variants in CATEGORY_KEYWORDS.items():
                if any(variant in (query_text or "").lower() for variant in variants):
                    if keyword_group in haystack or any(keyword_group == tag for tag in tags):
                        score += 5
            if stock_value > 0:
                score += 1
            scored_items.append((score, item, tags, stock_value))

        scored_items.sort(key=lambda row: (row[0], row[1].is_featured, row[3]), reverse=True)
        result = []
        for _, item, tags, stock_value in scored_items[:limit]:
            result.append(
                {
                    "name": item.name_ru,
                    "slug": item.slug,
                    "category": item.category.name_ru if item.category else "",
                    "category_slug": item.category.slug if item.category else "",
                    "price_per_day": item.price_per_day,
                    "stock": stock_value,
                    "gender": item.gender or "unisex",
                    "sizes": json.loads(item.sizes or "[]")[:8],
                    "tags": tags[:6],
                    "description_ru": (item.description_ru or "")[:220],
                    "brand_match": prefs["brand"],
                    "date_filtered": bool(prefs["start_date"] and prefs["end_date"]),
                }
            )
        return result

    @staticmethod
    def _build_catalog_answer(query_text: str | None, catalog_context: list, locale: str) -> str | None:
        text = (query_text or "").lower()
        prefs = ChatService._extract_preferences(query_text)
        query_terms = {
            token.strip().lower()
            for token in re.split(r"[^a-zA-Zа-яА-Яәіңғүұқөһ0-9]+", query_text or "")
            if len(token.strip()) >= 3
        }
        inventory_markers = {
            "price", "stock", "size", "helmet", "jacket", "ski", "snowboard", "boot", "tent",
            "\u0432 \u043d\u0430\u043b\u0438\u0447\u0438\u0438",
            "\u0435\u0441\u0442\u044c \u043b\u0438",
            "\u043a\u0430\u043a\u0438\u0435 \u0435\u0441\u0442\u044c",
            "\u0447\u0442\u043e \u0435\u0441\u0442\u044c",
            "\u049b\u0430\u043d\u0434\u0430\u0439 \u0431\u0430\u0440",
            "\u0431\u0430\u0440 \u043c\u0430",
            "\u049b\u043e\u043b\u0434\u0430 \u0431\u0430\u0440",
            "\u0440\u0430\u0437\u043c\u0435\u0440",
            "\u04e9\u043b\u0448\u0435\u043c",
            "\u0434\u043e ",
            "available",
        }
        advisory_markers = {
            "\u043d\u0435 \u043a\u0435\u0440\u0435\u043a",
            "\u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e",
            "\u0447\u0442\u043e \u0432\u0437\u044f\u0442\u044c",
            "\u0447\u0442\u043e \u043b\u0443\u0447\u0448\u0435",
            "\u043f\u043e\u0441\u043e\u0432\u0435\u0442\u0443\u0439",
            "\u0441\u043e\u0432\u0435\u0442",
            "\u043f\u043e\u043c\u043e\u0433\u0438",
            "\u043a\u04e9\u043c\u0435\u043a",
            "\u043f\u043e\u0434\u0441\u043a\u0430\u0436\u0438",
            "recommend", "suggest", "for trip",
            "\u0431\u0430\u0440\u0430\u0442\u044b\u043d \u0435\u0434\u0456\u043c",
            "\u0435\u0434\u0435\u043c",
            "\u043f\u043e\u0445\u043e\u0434",
            "\u043a\u0435\u043c\u043f\u0438\u043d\u0433\u043a\u0435",
            "\u0442\u0430\u0443\u0493\u0430",
            "trip", "camping",
        }
        has_inventory_marker = any(marker in text for marker in inventory_markers)
        has_advisory_marker = any(marker in text for marker in advisory_markers)
        is_catalog_question = (
            has_inventory_marker
            or prefs["size"] is not None
            or prefs["budget_max"] is not None
            or prefs["start_date"] is not None
            or prefs["gender"] is not None
            or prefs["brand"] is not None
        )
        if has_advisory_marker and not has_inventory_marker:
            return None
        if not is_catalog_question or not catalog_context:
            return None

        requested_groups = [
            group
            for group, variants in CATEGORY_KEYWORDS.items()
            if any(variant in text for variant in variants)
        ]

        def matches_requested_groups(item: dict) -> bool:
            if not requested_groups:
                return True
            haystack = " ".join(
                [
                    item.get("name", ""),
                    item.get("category", ""),
                    item.get("category_slug", ""),
                    item.get("description_ru", ""),
                    " ".join(item.get("tags", [])),
                ]
            ).lower()
            return any(group in haystack for group in requested_groups)

        def matches_gender(item: dict) -> bool:
            if not prefs["gender"]:
                return True
            if prefs["gender"] == "female":
                return item.get("gender") in {"female", "unisex"}
            if prefs["gender"] == "male":
                return item.get("gender") in {"male", "unisex"}
            return True

        def matches_budget(item: dict) -> bool:
            return prefs["budget_max"] is None or item.get("price_per_day", 0) <= prefs["budget_max"]

        def matches_size(item: dict) -> bool:
            if not prefs["size"]:
                return True
            requested = prefs["size"].lower()
            for size in item.get("sizes", []):
                value = str(size.get("value", "")).strip().lower() if isinstance(size, dict) else str(size).strip().lower()
                label = str(size.get("label", "")).strip().lower() if isinstance(size, dict) else value
                if requested in {value, label}:
                    return True
            return False

        filtered_items = [
            item
            for item in catalog_context
            if item.get("stock", 0) > 0
            and matches_requested_groups(item)
            and matches_gender(item)
            and matches_budget(item)
            and matches_size(item)
        ]

        available_items = filtered_items[:3] if filtered_items else [item for item in catalog_context if item.get("stock", 0) > 0][:3]
        if not available_items:
            if locale == "kk":
                return "Қазір осы сұранысқа сай бос позиция табылмады. Каталогтағы сүзгілерді қарап немесе AI-подборды қолданып көріңіз."
            if locale == "en":
                return "I couldn't find available items for this request right now. Please check the catalog filters or use the AI подбор page."
            return "Сейчас по этому запросу нет доступных позиций. Посмотрите фильтры в /catalog или откройте /ai для подбора."

        date_note_kk = ""
        date_note_en = ""
        date_note_ru = ""
        if prefs["start_date"] and prefs["end_date"]:
            date_range = f"{prefs['start_date'].isoformat()} – {prefs['end_date'].isoformat()}"
            date_note_kk = f" {date_range} күндеріне қарап"
            date_note_en = f" for {date_range}"
            date_note_ru = f" на даты {date_range}"

        if locale == "kk":
            parts = [
                f"{item['name']} — {item['price_per_day']} ₸/күн, қолда бар саны: {item['stock']}"
                for item in available_items
            ]
            return "Сұранысыңызға жақын" + date_note_kk + " мына позициялар бар: " + "; ".join(parts) + ". Толығын /catalog арқылы ашып, күндерді таңдай аласыз."

        if locale == "en":
            parts = [
                f"{item['name']} — {item['price_per_day']} ₸/day, available: {item['stock']}"
                for item in available_items
            ]
            return "Here are relevant available items" + date_note_en + ": " + "; ".join(parts) + ". You can open /catalog to review details and choose dates."

        parts = [
            f"{item['name']} — {item['price_per_day']} ₸/день, в наличии: {item['stock']}"
            for item in available_items
        ]
        return "По вашему запросу сейчас доступны" + date_note_ru + ": " + "; ".join(parts) + ". Полные детали и даты аренды можно выбрать в /catalog."

    @staticmethod
    def _extract_preferences(query_text: str | None) -> dict:
        text = (query_text or "").lower()

        gender = None
        if any(token in text for token in ["\u0436\u0435\u043d", "female", "\u04d9\u0439\u0435\u043b", "\u0434\u0435\u0432\u0443\u0448"]):
            gender = "female"
        elif any(token in text for token in ["\u043c\u0443\u0436", "male", "\u0435\u0440", "\u043f\u0430\u0440\u043d"]):
            gender = "male"

        brand = next((brand for brand in BRAND_KEYWORDS if brand in text), None)

        size = None
        size_match = re.search(r"\b(xxs|xs|xl|xxl|s|m|l)\b", text, re.IGNORECASE)
        if size_match:
            size = size_match.group(1).upper()
        else:
            numeric_size = re.search(r"(?:\u0440\u0430\u0437\u043c\u0435\u0440|size|\u04e9\u043b\u0448\u0435\u043c)\s*(\d{2,3})", text)
            if numeric_size:
                size = numeric_size.group(1)

        budget_max = None
        budget_match = re.search(r"(?:\u0434\u043e|up to|budget|\u0431\u044e\u0434\u0436\u0435\u0442)\s*(\d{4,6})", text)
        if budget_match:
            budget_max = int(budget_match.group(1))

        start_date = None
        end_date = None
        parsed_dates = []
        for raw in re.findall(r"\b\d{4}-\d{2}-\d{2}\b|\b\d{2}\.\d{2}\.\d{4}\b", query_text or ""):
            try:
                if "." in raw:
                    parsed_dates.append(datetime.strptime(raw, "%d.%m.%Y").date())
                else:
                    parsed_dates.append(date.fromisoformat(raw))
            except ValueError:
                continue
        if len(parsed_dates) >= 2:
            start_date, end_date = parsed_dates[0], parsed_dates[1]
            if end_date < start_date:
                start_date, end_date = end_date, start_date

        return {
            "gender": gender,
            "brand": brand,
            "size": size,
            "budget_max": budget_max,
            "start_date": start_date,
            "end_date": end_date,
        }

    @staticmethod
    def _size_matches(item: Equipment, requested_size: str) -> bool:
        for size in json.loads(item.sizes or "[]"):
            value = str(size.get("value", "")).strip().lower() if isinstance(size, dict) else str(size).strip().lower()
            label = str(size.get("label", "")).strip().lower() if isinstance(size, dict) else value
            if requested_size.lower() in {value, label}:
                return True
        return False

    @staticmethod
    def _is_advice_question(query_text: str | None) -> bool:
        text = (query_text or "").lower()
        advice_terms = [
            "\u043d\u0435 \u043a\u0435\u0440\u0435\u043a",
            "\u0447\u0442\u043e \u043d\u0443\u0436\u043d\u043e",
            "\u0447\u0442\u043e \u0432\u0437\u044f\u0442\u044c",
            "\u0447\u0442\u043e \u043b\u0443\u0447\u0448\u0435",
            "\u043f\u043e\u0441\u043e\u0432\u0435\u0442\u0443\u0439",
            "\u043f\u043e\u0434\u0441\u043a\u0430\u0436\u0438",
            "\u043a\u04e9\u043c\u0435\u043a",
            "\u0431\u0430\u0440\u0430\u0442\u044b\u043d \u0435\u0434\u0456\u043c",
            "\u0442\u0430\u0443\u0493\u0430",
            "\u043f\u043e\u0445\u043e\u0434",
            "\u043a\u0435\u043c\u043f\u0438\u043d\u0433",
            "recommend",
            "suggest",
            "trip",
        ]
        inventory_terms = [
            "\u0432 \u043d\u0430\u043b\u0438\u0447\u0438\u0438",
            "\u0435\u0441\u0442\u044c \u043b\u0438",
            "\u0440\u0430\u0437\u043c\u0435\u0440",
            "\u04e9\u043b\u0448\u0435\u043c",
            "\u0434\u043e ",
            "available",
            "price",
            "stock",
        ]
        return any(term in text for term in advice_terms) and not any(term in text for term in inventory_terms)
