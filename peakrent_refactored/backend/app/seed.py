"""
app/seed.py — Заполнение базы данных начальными данными

Эта функция вызывается при первом запуске приложения.
Проверяет, есть ли данные в БД, и если нет — заполняет тестовыми данными.

Что создаётся:
    - 6 категорий снаряжения (Лыжи, Сноуборд, Хайкинг, etc.)
    - 13 единиц снаряжения с фотографиями, тегами, размерами
    - 1 администратор (phone: +77000000000, OTP: 123456)
"""

import json
from .extensions import db


def seed_database():
    """
    Заполняет БД начальными данными при первом запуске.
    Идемпотентная функция — не дублирует данные при повторном вызове.
    """
    # Импортируем модели внутри функции чтобы избежать циклических импортов
    from .models import Category, Equipment, User

    # Проверяем, нужно ли сидить
    if Category.query.count() > 0:
        return  # Данные уже есть — пропускаем

    print("🌱 Заполняем базу данных начальными данными...")

    # ── Категории ─────────────────────────────────────────────────────────────
    categories_data = [
        ("skiing",    "Горные лыжи", "Тау шаңғысы",  "Skiing",    "⛷️", 1),
        ("snowboard", "Сноуборд",    "Сноуборд",      "Snowboard", "🏂", 2),
        ("hiking",    "Хайкинг",     "Хайкинг",       "Hiking",    "🥾", 3),
        ("camping",   "Кемпинг",     "Кемпинг",       "Camping",   "⛺", 4),
        ("climbing",  "Альпинизм",   "Альпинизм",     "Climbing",  "🧗", 5),
        ("trekking",  "Треккинг",    "Треккинг",      "Trekking",  "🗺️", 6),
    ]

    categories = {}
    for slug, name_ru, name_kk, name_en, icon, order in categories_data:
        cat = Category(
            slug=slug, name_ru=name_ru, name_kk=name_kk,
            name_en=name_en, icon=icon, sort_order=order,
        )
        db.session.add(cat)
        categories[slug] = cat

    db.session.flush()  # Получаем ID категорий без коммита

    # Базовый URL для фотографий (Unsplash — бесплатные фото)
    IMG = "https://images.unsplash.com/photo-"
    J   = json.dumps  # Сокращение для json.dumps

    # ── Снаряжение ────────────────────────────────────────────────────────────
    equipment_data = [

        # ── Горные лыжи ───────────────────────────────────────────────────────
        {
            "slug": "alpine-ski-set",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный комплект (взрослый)",
            "name_kk": "Тау шаңғы жиынтығы (ересек)",
            "name_en": "Alpine Ski Set (adult)",
            "description_ru": "Полный горнолыжный комплект: лыжи, крепления, палки. Настроены и заточены перед каждой выдачей. Доступны все размеры 150–180 см.",
            "description_en": "Full alpine ski set: skis, bindings, poles. Tuned before every rental. Sizes 150–180 cm.",
            "price_per_day": 22000, "deposit_amount": 50000, "stock": 10,
            "images": J([IMG + "1565992441121-4367e2049ef3?w=800&auto=format&fit=crop"]),
            "tags": J(["skiing", "alpine", "winter", "beginner-friendly"]),
            "sizes": J([
                {"value": "150", "label": "150 см", "description_ru": "Рост 155–165 см"},
                {"value": "160", "label": "160 см", "description_ru": "Рост 165–175 см"},
                {"value": "170", "label": "170 см", "description_ru": "Рост 175–185 см"},
                {"value": "180", "label": "180 см", "description_ru": "Рост 185+ см"},
            ]),
            "size_type": "ski_length",
            "is_featured": True,
            "peak_months": J([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-helmet",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный шлем",
            "name_kk": "Тау шаңғы дулығасы",
            "name_en": "Ski Helmet",
            "description_ru": "Сертифицированный шлем с системой вентиляции. Размеры S/M/L/XL.",
            "description_en": "Certified ski helmet with ventilation. Sizes S/M/L/XL.",
            "price_per_day": 5000, "deposit_amount": 15000, "stock": 20,
            "images": J([IMG + "1605291535408-0f7c82c2a0db?w=800&auto=format&fit=crop"]),
            "tags": J(["helmet", "skiing", "snowboard", "safety", "winter"]),
            "sizes": J([
                {"value": "S",  "label": "S",  "description_ru": "54–56 см"},
                {"value": "M",  "label": "M",  "description_ru": "57–58 см"},
                {"value": "L",  "label": "L",  "description_ru": "59–60 см"},
                {"value": "XL", "label": "XL", "description_ru": "61+ см"},
            ]),
            "size_type": "clothing",
            "is_featured": False,
            "peak_months": J([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-goggles",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжные очки",
            "name_kk": "Тау шаңғы көзілдіріктері",
            "name_en": "Ski Goggles",
            "description_ru": "Двойная линза с UV-защитой. Совместимы с любым шлемом.",
            "description_en": "Double lens with UV protection. Compatible with any helmet.",
            "price_per_day": 3500, "deposit_amount": 10000, "stock": 25,
            "images": J([IMG + "1519309087-b2ca7c6f5d6a?w=800&auto=format&fit=crop"]),
            "tags": J(["goggles", "skiing", "snowboard", "winter"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": False, "peak_months": J([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-jacket",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжная куртка + штаны",
            "name_kk": "Тау шаңғы костюмі",
            "name_en": "Ski Jacket + Pants",
            "description_ru": "Водонепроницаемый костюм 10 000 мм. Утеплитель 150г. Размеры XS–XXL.",
            "description_en": "Waterproof ski suit 10 000 mm. 150g insulation. Sizes XS–XXL.",
            "price_per_day": 12000, "deposit_amount": 35000, "stock": 15,
            "images": J([IMG + "1548099693-41f4b2b8b5e0?w=800&auto=format&fit=crop"]),
            "tags": J(["jacket", "skiing", "snowboard", "waterproof", "winter", "thermal"]),
            "sizes": J([
                {"value": "XS", "label": "XS"}, {"value": "S",  "label": "S"},
                {"value": "M",  "label": "M"},  {"value": "L",  "label": "L"},
                {"value": "XL", "label": "XL"}, {"value": "XXL","label": "XXL"},
            ]),
            "size_type": "clothing",
            "is_featured": True, "peak_months": J([11, 12, 1, 2, 3]),
        },

        # ── Сноуборд ──────────────────────────────────────────────────────────
        {
            "slug": "snowboard-set",
            "category_id": categories["snowboard"].id,
            "name_ru": "Сноуборд-комплект",
            "name_kk": "Сноуборд жиынтығы",
            "name_en": "Snowboard Set",
            "description_ru": "Доска + крепления + ботинки. Подбор по росту и весу клиента.",
            "description_en": "Board + bindings + boots. Matched to your height and weight.",
            "price_per_day": 25000, "deposit_amount": 60000, "stock": 8,
            "images": J([IMG + "1518609571773-40fb0a5b26e7?w=800&auto=format&fit=crop"]),
            "tags": J(["snowboard", "winter", "boots", "freestyle"]),
            "sizes": J([
                {"value": "150", "label": "150 см", "description_ru": "Рост до 165 см"},
                {"value": "158", "label": "158 см", "description_ru": "Рост 165–175 см"},
                {"value": "162", "label": "162 см", "description_ru": "Рост 175+ см"},
            ]),
            "size_type": "ski_length",
            "is_featured": True, "peak_months": J([11, 12, 1, 2, 3]),
        },

        # ── Хайкинг ───────────────────────────────────────────────────────────
        {
            "slug": "trekking-boots",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговые ботинки",
            "name_kk": "Треккинг ботинкалары",
            "name_en": "Trekking Boots",
            "description_ru": "Водонепроницаемые Gore-Tex. Все размеры 36–46. Подходят для горных троп.",
            "description_en": "Gore-Tex waterproof boots. Sizes 36–46.",
            "price_per_day": 7000, "deposit_amount": 20000, "stock": 18,
            "images": J([IMG + "1511816045709-24cd2c0bf6f1?w=800&auto=format&fit=crop"]),
            "tags": J(["boots", "hiking", "trekking", "waterproof", "footwear"]),
            "sizes": J([{"value": str(s), "label": str(s)} for s in range(36, 47)]),
            "size_type": "boot_size",
            "is_featured": True, "peak_months": J([4, 5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "hiking-backpack-60l",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговый рюкзак 60L",
            "name_kk": "Треккинг рюкзагы 60L",
            "name_en": "Trekking Backpack 60L",
            "description_ru": "Анатомическая спина, дождевик в комплекте. Для многодневных походов.",
            "description_en": "Ergonomic back system, rain cover included.",
            "price_per_day": 6000, "deposit_amount": 18000, "stock": 12,
            "images": J([IMG + "1553062407-98eeb64c6a62?w=800&auto=format&fit=crop"]),
            "tags": J(["backpack", "hiking", "trekking", "multi-day", "60L"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": True, "peak_months": J([4, 5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "trekking-poles",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговые палки (пара)",
            "name_kk": "Треккинг таяқшалары",
            "name_en": "Trekking Poles (pair)",
            "description_ru": "Алюминиевые складные, регулируемые 100–130 см.",
            "description_en": "Aluminium folding poles, adjustable 100–130 cm.",
            "price_per_day": 2500, "deposit_amount": 8000, "stock": 25,
            "images": J([IMG + "1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop"]),
            "tags": J(["poles", "hiking", "trekking"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": False, "peak_months": J([4, 5, 6, 7, 8, 9, 10]),
        },

        # ── Кемпинг ───────────────────────────────────────────────────────────
        {
            "slug": "tent-4season",
            "category_id": categories["camping"].id,
            "name_ru": "Палатка 4-сезонная (2 места)",
            "name_kk": "4 маусымдық шатыр (2 орын)",
            "name_en": "4-Season Tent (2P)",
            "description_ru": "Геодезический купол. Выдерживает до -30°C и сильный ветер.",
            "description_en": "Geodesic dome. Handles -30°C and strong winds.",
            "price_per_day": 12000, "deposit_amount": 40000, "stock": 6,
            "images": J([IMG + "1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop"]),
            "tags": J(["tent", "camping", "shelter", "winter", "expedition"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": True, "peak_months": J([5, 6, 7, 8, 9]),
        },
        {
            "slug": "sleeping-bag-m10",
            "category_id": categories["camping"].id,
            "name_ru": "Спальный мешок -10°C",
            "name_kk": "Ұйқы қабы -10°C",
            "name_en": "Sleeping Bag -10°C",
            "description_ru": "Пуховый спальник-мумия. Комфорт до -10°C.",
            "description_en": "Down mummy bag. Comfort to -10°C.",
            "price_per_day": 5500, "deposit_amount": 20000, "stock": 14,
            "images": J([IMG + "1478827387698-1527781a4887?w=800&auto=format&fit=crop"]),
            "tags": J(["sleeping bag", "camping", "winter", "down"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": False, "peak_months": J([5, 6, 7, 8, 9]),
        },
        {
            "slug": "camp-stove",
            "category_id": categories["camping"].id,
            "name_ru": "Газовая горелка + посуда",
            "name_kk": "Газ жанарғы + ыдыс-аяқ",
            "name_en": "Gas Stove + Cookset",
            "description_ru": "Горелка + 2 кастрюли + сковорода. Газовый баллон в комплекте.",
            "description_en": "Stove + 2 pots + pan. Gas canister included.",
            "price_per_day": 3500, "deposit_amount": 12000, "stock": 10,
            "images": J([IMG + "1484500168-a8a96e9b0329?w=800&auto=format&fit=crop"]),
            "tags": J(["stove", "camping", "cooking", "gas"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": False, "peak_months": J([5, 6, 7, 8, 9]),
        },

        # ── Альпинизм ─────────────────────────────────────────────────────────
        {
            "slug": "climbing-harness",
            "category_id": categories["climbing"].id,
            "name_ru": "Страховочная система",
            "name_kk": "Сақтандыру жүйесі",
            "name_en": "Climbing Harness",
            "description_ru": "Беседка с 4 петлями для снаряжения. Регулируемые ножные петли. Размеры S/M/L.",
            "description_en": "Harness with 4 gear loops. Adjustable leg loops. S/M/L.",
            "price_per_day": 4000, "deposit_amount": 18000, "stock": 16,
            "images": J([IMG + "1601933974846-51571e4c5cce?w=800&auto=format&fit=crop"]),
            "tags": J(["harness", "climbing", "safety", "via ferrata"]),
            "sizes": J([
                {"value": "S", "label": "S"},
                {"value": "M", "label": "M"},
                {"value": "L", "label": "L"},
            ]),
            "size_type": "clothing",
            "is_featured": False, "peak_months": J([5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "dynamic-rope-60m",
            "category_id": categories["climbing"].id,
            "name_ru": "Динамическая верёвка 60м",
            "name_kk": "Динамикалық арқан 60м",
            "name_en": "Dynamic Rope 60m",
            "description_ru": "9.8мм с сухой обработкой. Для одинарной техники.",
            "description_en": "9.8mm dry-treated single rope.",
            "price_per_day": 8000, "deposit_amount": 35000, "stock": 7,
            "images": J([IMG + "1522163182402-834f871fd851?w=800&auto=format&fit=crop"]),
            "tags": J(["rope", "climbing", "safety", "dynamic"]),
            "sizes": J([]), "size_type": "none",
            "is_featured": False, "peak_months": J([5, 6, 7, 8, 9, 10]),
        },
    ]

    # Добавляем снаряжение в сессию
    for item_data in equipment_data:
        db.session.add(Equipment(**item_data))

    # ── Сотрудники системы ───────────────────────────────────────────────────
    from werkzeug.security import generate_password_hash

    # Администратор — полный доступ
    admin = User(
        phone="+77000000000",
        name="Admin",
        email="admin@peakrent.kz",
        password=generate_password_hash("admin123"),
        role="admin",
    )
    db.session.add(admin)

    # Менеджер — управление заказами и клиентами (без доступа к каталогу)
    manager = User(
        phone="+77000000001",
        name="Менеджер",
        email="manager@peakrent.kz",
        password=generate_password_hash("manager123"),
        role="manager",
    )
    db.session.add(manager)

    # Коммитим всё сразу
    db.session.commit()

    print(f"✅ Создано {len(equipment_data)} позиций снаряжения")
    print(f"✅ Создан admin:   admin@peakrent.kz   / admin123")
    print(f"✅ Создан manager: manager@peakrent.kz / manager123")
    print(f"   SMS вход (обычный юзер): +77000000000 (OTP: 123456)")
