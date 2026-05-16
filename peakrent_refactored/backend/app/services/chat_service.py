"""Site assistant chat service."""

from flask import current_app

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


def build_system_prompt(user_name: str | None = None, locale: str = "ru") -> str:
    language = {"ru": "Russian", "kk": "Kazakh", "en": "English"}.get(locale, "Russian")
    knowledge = "\n".join(SITE_KNOWLEDGE.values())
    user_line = f"User name: {user_name}. " if user_name else ""
    return (
        "You are the PeakRent.kz site assistant.\n"
        f"{user_line}Reply in {language}.\n"
        "Your role:\n"
        "- answer site navigation and service questions\n"
        "- help users move to the right page\n"
        "- give concise rental guidance without inventing facts\n"
        "- if the user needs tailored gear advice, suggest using /ai or the catalog\n"
        "Rules:\n"
        "- answer in 2-4 short sentences\n"
        "- use only the knowledge below\n"
        "- if information is missing, say to contact +7 (707) 123-45-67\n"
        "- include one clear next action when useful\n"
        f"Knowledge:\n{knowledge}"
    )


class ChatService:
    @staticmethod
    def reply(messages: list, user_name: str | None = None, locale: str = "ru") -> str:
        try:
            from openai import OpenAI

            api_key = current_app.config.get("OPENAI_API_KEY", "")
            if not api_key:
                return ChatService._fallback(messages, locale)

            client = OpenAI(api_key=api_key)
            full_messages = [{"role": "system", "content": build_system_prompt(user_name, locale)}] + messages[-10:]

            response = client.chat.completions.create(
                model=current_app.config.get("OPENAI_MODEL", "gpt-4o-mini"),
                messages=full_messages,
                max_tokens=450,
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
