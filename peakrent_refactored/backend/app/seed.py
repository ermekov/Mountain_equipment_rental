"""Seed the database with starter data for PeakRent."""

import json

from .extensions import db


def seed_database():
    """Populate the database with starter data if it is empty."""
    from .models import Category, Equipment, User

    if Category.query.count() > 0:
        return

    print("Seeding starter data...")

    categories_data = [
        ("skiing", "Горные лыжи", "Тау шаңғысы", "Skiing", "⛷️", 1),
        ("snowboard", "Сноуборд", "Сноуборд", "Snowboard", "🏂", 2),
        ("hiking", "Хайкинг", "Хайкинг", "Hiking", "🥾", 3),
        ("camping", "Кемпинг", "Кемпинг", "Camping", "⛺", 4),
        ("climbing", "Альпинизм", "Альпинизм", "Climbing", "🧗", 5),
        ("trekking", "Треккинг", "Треккинг", "Trekking", "🗺️", 6),
    ]

    categories = {}
    for slug, name_ru, name_kk, name_en, icon, order in categories_data:
        category = Category(
            slug=slug,
            name_ru=name_ru,
            name_kk=name_kk,
            name_en=name_en,
            icon=icon,
            sort_order=order,
        )
        db.session.add(category)
        categories[slug] = category

    db.session.flush()

    img = "https://images.unsplash.com/photo-"
    dumps = json.dumps

    equipment_data = [
        {
            "slug": "alpine-ski-set",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный комплект (взрослый)",
            "name_kk": "Тау шаңғы жиынтығы (ересек)",
            "name_en": "Alpine Ski Set (adult)",
            "description_ru": "Полный комплект: лыжи, крепления и палки. Универсальный вариант для проката.",
            "description_kk": "Толық жиынтық: шаңғы, бекіткіштер және таяқтар. Жалға беруге арналған әмбебап нұсқа.",
            "description_en": "Full set with skis, bindings, and poles. Universal rental option.",
            "price_per_day": 22000,
            "deposit_amount": 50000,
            "stock": 10,
            "images": dumps([img + "1565992441121-4367e2049ef3?w=800&auto=format&fit=crop"]),
            "tags": dumps(["skiing", "alpine", "winter", "beginner-friendly"]),
            "sizes": dumps(
                [
                    {"value": "150", "label": "150 см", "description_ru": "Рост 155-165 см"},
                    {"value": "160", "label": "160 см", "description_ru": "Рост 165-175 см"},
                    {"value": "170", "label": "170 см", "description_ru": "Рост 175-185 см"},
                    {"value": "180", "label": "180 см", "description_ru": "Рост 185+ см"},
                ]
            ),
            "size_type": "ski_length",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "alpine-ski-set-male",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный комплект мужской",
            "name_kk": "Ерлерге арналған тау шаңғы жиынтығы",
            "name_en": "Men's Alpine Ski Set",
            "description_ru": "Мужской комплект с более жесткой настройкой и ростовками для взрослых райдеров.",
            "description_kk": "Ересек ерлерге арналған қаттырақ бапталған тау шаңғы жиынтығы.",
            "description_en": "Men's ski set with stiffer setup and adult size ranges.",
            "price_per_day": 23000,
            "deposit_amount": 50000,
            "stock": 6,
            "images": dumps([img + "1517654443271-14f84c2c0435?w=800&auto=format&fit=crop"]),
            "tags": dumps(["skiing", "alpine", "winter", "male"]),
            "sizes": dumps(
                [
                    {"value": "165", "label": "165 см", "description_ru": "Рост 170-178 см"},
                    {"value": "175", "label": "175 см", "description_ru": "Рост 178-186 см"},
                    {"value": "182", "label": "182 см", "description_ru": "Рост 186+ см"},
                ]
            ),
            "size_type": "ski_length",
            "gender": "male",
            "is_featured": False,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "alpine-ski-set-female",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный комплект женский",
            "name_kk": "Әйелдерге арналған тау шаңғы жиынтығы",
            "name_en": "Women's Alpine Ski Set",
            "description_ru": "Женский комплект с более легкой геометрией и комфортной настройкой.",
            "description_kk": "Жеңіл геометриясы бар және ыңғайлы бапталған әйелдер жиынтығы.",
            "description_en": "Women's ski set with lighter geometry and comfortable tuning.",
            "price_per_day": 23000,
            "deposit_amount": 50000,
            "stock": 6,
            "images": dumps([img + "1486911278844-a81c5267e227?w=800&auto=format&fit=crop"]),
            "tags": dumps(["skiing", "alpine", "winter", "female"]),
            "sizes": dumps(
                [
                    {"value": "145", "label": "145 см", "description_ru": "Рост 150-160 см"},
                    {"value": "155", "label": "155 см", "description_ru": "Рост 160-170 см"},
                    {"value": "165", "label": "165 см", "description_ru": "Рост 170+ см"},
                ]
            ),
            "size_type": "ski_length",
            "gender": "female",
            "is_featured": False,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-helmet",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжный шлем",
            "name_kk": "Тау шаңғы дулығасы",
            "name_en": "Ski Helmet",
            "description_ru": "Сертифицированный шлем с вентиляцией. Размеры S/M/L/XL.",
            "description_kk": "Желдетуі бар сертификатталған дулыға. Өлшемдері S/M/L/XL.",
            "description_en": "Certified ski helmet with ventilation. Sizes S/M/L/XL.",
            "price_per_day": 5000,
            "deposit_amount": 15000,
            "stock": 20,
            "images": dumps([img + "1605291535408-0f7c82c2a0db?w=800&auto=format&fit=crop"]),
            "tags": dumps(["helmet", "skiing", "snowboard", "safety", "winter"]),
            "sizes": dumps(
                [
                    {"value": "S", "label": "S", "description_ru": "54-56 см"},
                    {"value": "M", "label": "M", "description_ru": "57-58 см"},
                    {"value": "L", "label": "L", "description_ru": "59-60 см"},
                    {"value": "XL", "label": "XL", "description_ru": "61+ см"},
                ]
            ),
            "size_type": "clothing",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-goggles",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжные очки",
            "name_kk": "Тау шаңғы көзілдірігі",
            "name_en": "Ski Goggles",
            "description_ru": "Двойная линза с UV-защитой. Совместимы с любым шлемом.",
            "description_kk": "Қос линза және UV-қорғаныс. Кез келген дулығамен үйлеседі.",
            "description_en": "Double lens with UV protection. Compatible with any helmet.",
            "price_per_day": 3500,
            "deposit_amount": 10000,
            "stock": 25,
            "images": dumps([img + "1519309087-b2ca7c6f5d6a?w=800&auto=format&fit=crop"]),
            "tags": dumps(["goggles", "skiing", "snowboard", "winter"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-jacket",
            "category_id": categories["skiing"].id,
            "name_ru": "Горнолыжная куртка + штаны",
            "name_kk": "Тау шаңғы костюмі",
            "name_en": "Ski Jacket + Pants",
            "description_ru": "Водонепроницаемый костюм с утеплителем. Размеры XS-XXL.",
            "description_kk": "Су өткізбейтін, жылуы бар костюм. Өлшемдері XS-XXL.",
            "description_en": "Waterproof insulated ski suit. Sizes XS-XXL.",
            "price_per_day": 12000,
            "deposit_amount": 35000,
            "stock": 15,
            "images": dumps([img + "1548099693-41f4b2b8b5e0?w=800&auto=format&fit=crop"]),
            "tags": dumps(["jacket", "skiing", "snowboard", "waterproof", "winter", "thermal"]),
            "sizes": dumps(
                [
                    {"value": "XS", "label": "XS"},
                    {"value": "S", "label": "S"},
                    {"value": "M", "label": "M"},
                    {"value": "L", "label": "L"},
                    {"value": "XL", "label": "XL"},
                    {"value": "XXL", "label": "XXL"},
                ]
            ),
            "size_type": "clothing",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "ski-jacket-female",
            "category_id": categories["skiing"].id,
            "name_ru": "Женская горнолыжная куртка",
            "name_kk": "Әйелдерге арналған тау шаңғы күртесі",
            "name_en": "Women's Ski Jacket",
            "description_ru": "Утепленная женская куртка с приталенным кроем и снегозащитной юбкой.",
            "description_kk": "Бел сызығы қынама және қардан қорғайтын белдігі бар әйелдер күртесі.",
            "description_en": "Women's insulated ski jacket with a tailored fit and snow skirt.",
            "price_per_day": 9000,
            "deposit_amount": 25000,
            "stock": 8,
            "images": dumps([img + "1483985988355-763728e1935b?w=800&auto=format&fit=crop"]),
            "tags": dumps(["jacket", "skiing", "winter", "female", "waterproof"]),
            "sizes": dumps(
                [
                    {"value": "XS", "label": "XS"},
                    {"value": "S", "label": "S"},
                    {"value": "M", "label": "M"},
                    {"value": "L", "label": "L"},
                ]
            ),
            "size_type": "clothing",
            "gender": "female",
            "is_featured": False,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "snowboard-set",
            "category_id": categories["snowboard"].id,
            "name_ru": "Сноуборд-комплект",
            "name_kk": "Сноуборд жиынтығы",
            "name_en": "Snowboard Set",
            "description_ru": "Доска, крепления и ботинки. Подбор по росту и весу клиента.",
            "description_kk": "Тақта, бекіткіштер және ботинкалар. Клиенттің бойы мен салмағына сай таңдалады.",
            "description_en": "Board, bindings, and boots matched to your height and weight.",
            "price_per_day": 25000,
            "deposit_amount": 60000,
            "stock": 8,
            "images": dumps([img + "1518609571773-40fb0a5b26e7?w=800&auto=format&fit=crop"]),
            "tags": dumps(["snowboard", "winter", "boots", "freestyle"]),
            "sizes": dumps(
                [
                    {"value": "150", "label": "150 см", "description_ru": "Рост до 165 см"},
                    {"value": "158", "label": "158 см", "description_ru": "Рост 165-175 см"},
                    {"value": "162", "label": "162 см", "description_ru": "Рост 175+ см"},
                ]
            ),
            "size_type": "ski_length",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([11, 12, 1, 2, 3]),
        },
        {
            "slug": "trekking-boots",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговые ботинки",
            "name_kk": "Треккинг ботинкалары",
            "name_en": "Trekking Boots",
            "description_ru": "Водонепроницаемые ботинки Gore-Tex. Размеры 36-46.",
            "description_kk": "Gore-Tex су өткізбейтін ботинкалар. Өлшемдері 36-46.",
            "description_en": "Waterproof Gore-Tex boots. Sizes 36-46.",
            "price_per_day": 7000,
            "deposit_amount": 20000,
            "stock": 18,
            "images": dumps([img + "1511816045709-24cd2c0bf6f1?w=800&auto=format&fit=crop"]),
            "tags": dumps(["boots", "hiking", "trekking", "waterproof", "footwear"]),
            "sizes": dumps([{"value": str(size), "label": str(size)} for size in range(36, 47)]),
            "size_type": "boot_size",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([4, 5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "hiking-backpack-60l",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговый рюкзак 60L",
            "name_kk": "Треккинг рюкзагы 60L",
            "name_en": "Trekking Backpack 60L",
            "description_ru": "Анатомическая спина, дождевик в комплекте. Для многодневных походов.",
            "description_kk": "Анатомиялық арқалығы бар, жаңбыр жабыны қоса беріледі. Көпкүндік жорықтарға арналған.",
            "description_en": "Ergonomic backpack with rain cover for multi-day trips.",
            "price_per_day": 6000,
            "deposit_amount": 18000,
            "stock": 12,
            "images": dumps([img + "1553062407-98eeb64c6a62?w=800&auto=format&fit=crop"]),
            "tags": dumps(["backpack", "hiking", "trekking", "multi-day", "60L"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([4, 5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "trekking-poles",
            "category_id": categories["hiking"].id,
            "name_ru": "Треккинговые палки (пара)",
            "name_kk": "Треккинг таяқшалары",
            "name_en": "Trekking Poles (pair)",
            "description_ru": "Складные алюминиевые палки, регулируются в диапазоне 100-130 см.",
            "description_kk": "Жиналмалы алюминий таяқшалар, 100-130 см аралығында реттеледі.",
            "description_en": "Foldable aluminum poles adjustable from 100 to 130 cm.",
            "price_per_day": 2500,
            "deposit_amount": 8000,
            "stock": 25,
            "images": dumps([img + "1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop"]),
            "tags": dumps(["poles", "hiking", "trekking"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([4, 5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "tent-4season",
            "category_id": categories["camping"].id,
            "name_ru": "Палатка 4-сезонная (2 места)",
            "name_kk": "4 маусымдық шатыр (2 орын)",
            "name_en": "4-Season Tent (2P)",
            "description_ru": "Экспедиционная палатка для ветреной и холодной погоды.",
            "description_kk": "Желді әрі суық ауа райына арналған экспедициялық шатыр.",
            "description_en": "Expedition tent for windy and cold weather.",
            "price_per_day": 12000,
            "deposit_amount": 40000,
            "stock": 6,
            "images": dumps([img + "1504280390367-361c6d9f38f4?w=800&auto=format&fit=crop"]),
            "tags": dumps(["tent", "camping", "shelter", "winter", "expedition"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": True,
            "peak_months": dumps([5, 6, 7, 8, 9]),
        },
        {
            "slug": "sleeping-bag-m10",
            "category_id": categories["camping"].id,
            "name_ru": "Спальный мешок -10°C",
            "name_kk": "Ұйқы қапы -10°C",
            "name_en": "Sleeping Bag -10°C",
            "description_ru": "Пуховый спальник-кокон с комфортом до -10°C.",
            "description_kk": "-10°C дейін жайлы қолдануға болатын мамық ұйқы қапы.",
            "description_en": "Down sleeping bag with comfort down to -10°C.",
            "price_per_day": 5500,
            "deposit_amount": 20000,
            "stock": 14,
            "images": dumps([img + "1478827387698-1527781a4887?w=800&auto=format&fit=crop"]),
            "tags": dumps(["sleeping bag", "camping", "winter", "down"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([5, 6, 7, 8, 9]),
        },
        {
            "slug": "camp-stove",
            "category_id": categories["camping"].id,
            "name_ru": "Газовая горелка + посуда",
            "name_kk": "Газ жанарғы + ыдыс-аяқ",
            "name_en": "Gas Stove + Cookset",
            "description_ru": "Компактная горелка и набор посуды для походной кухни.",
            "description_kk": "Жорық асүйіне арналған ықшам жанарғы мен ыдыс жиынтығы.",
            "description_en": "Compact stove and cookware set for outdoor cooking.",
            "price_per_day": 3500,
            "deposit_amount": 12000,
            "stock": 10,
            "images": dumps([img + "1484500168-a8a96e9b0329?w=800&auto=format&fit=crop"]),
            "tags": dumps(["stove", "camping", "cooking", "gas"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([5, 6, 7, 8, 9]),
        },
        {
            "slug": "climbing-harness",
            "category_id": categories["climbing"].id,
            "name_ru": "Страховочная система",
            "name_kk": "Сақтандыру жүйесі",
            "name_en": "Climbing Harness",
            "description_ru": "Регулируемая система с четырьмя петлями для снаряжения.",
            "description_kk": "Жабдыққа арналған төрт ілмегі бар реттелетін сақтандыру жүйесі.",
            "description_en": "Adjustable climbing harness with four gear loops.",
            "price_per_day": 4000,
            "deposit_amount": 18000,
            "stock": 16,
            "images": dumps([img + "1601933974846-51571e4c5cce?w=800&auto=format&fit=crop"]),
            "tags": dumps(["harness", "climbing", "safety", "via ferrata"]),
            "sizes": dumps(
                [
                    {"value": "S", "label": "S"},
                    {"value": "M", "label": "M"},
                    {"value": "L", "label": "L"},
                ]
            ),
            "size_type": "clothing",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([5, 6, 7, 8, 9, 10]),
        },
        {
            "slug": "dynamic-rope-60m",
            "category_id": categories["climbing"].id,
            "name_ru": "Динамическая верёвка 60м",
            "name_kk": "Динамикалық арқан 60м",
            "name_en": "Dynamic Rope 60m",
            "description_ru": "Одинарная динамическая верёвка 9.8 мм для спортивного лазания.",
            "description_kk": "Спорттық өрмелеуге арналған 9.8 мм жалғыз динамикалық арқан.",
            "description_en": "9.8 mm single dynamic rope for sport climbing.",
            "price_per_day": 8000,
            "deposit_amount": 35000,
            "stock": 7,
            "images": dumps([img + "1522163182402-834f871fd851?w=800&auto=format&fit=crop"]),
            "tags": dumps(["rope", "climbing", "safety", "dynamic"]),
            "sizes": dumps([]),
            "size_type": "none",
            "gender": "unisex",
            "is_featured": False,
            "peak_months": dumps([5, 6, 7, 8, 9, 10]),
        },
    ]

    for item_data in equipment_data:
        db.session.add(Equipment(**item_data))

    from werkzeug.security import generate_password_hash

    admin = User(
        phone="+77000000000",
        name="Admin",
        email="admin@peakrent.kz",
        password=generate_password_hash("admin123"),
        role="admin",
    )
    db.session.add(admin)

    manager = User(
        phone="+77000000001",
        name="Менеджер",
        email="manager@peakrent.kz",
        password=generate_password_hash("manager123"),
        role="manager",
    )
    db.session.add(manager)

    db.session.commit()

    print(f"Seeded {len(equipment_data)} equipment items")
    print("Created admin: admin@peakrent.kz / admin123")
    print("Created manager: manager@peakrent.kz / manager123")
