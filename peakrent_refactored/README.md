# 🏔️ PeakRent.kz — Дипломный проект

**Платформа аренды горного снаряжения для Казахстана**
Flask + Next.js + PostgreSQL + OpenAI GPT-4o-mini + Kaspi QR

---

## 🏗️ Архитектура бэкенда (рефакторинг для диплома)

### Структура проекта
```
backend/
├── run.py                          ← Точка входа (запуск сервера)
├── requirements.txt                ← Python зависимости
├── .env                            ← Переменные окружения (секреты)
│
└── app/
    ├── __init__.py                 ← Application Factory (create_app)
    ├── config.py                   ← Конфигурация (Dev/Prod)
    ├── extensions.py               ← Flask расширения (db, cors)
    ├── seed.py                     ← Начальные данные БД
    │
    ├── models/                     ← SQLAlchemy модели (таблицы БД)
    │   ├── __init__.py
    │   ├── user.py                 ← User, OTPCode
    │   ├── equipment.py            ← Equipment, Category
    │   ├── booking.py              ← Booking, BookingItem
    │   └── review.py               ← Review
    │
    ├── routes/                     ← Flask Blueprint маршруты (REST API)
    │   ├── __init__.py
    │   ├── auth.py                 ← /api/auth/*
    │   ├── equipment.py            ← /api/equipment/*
    │   ├── bookings.py             ← /api/bookings/*
    │   ├── payments.py             ← /api/payments/*
    │   ├── recommendations.py      ← /api/recommendations, /api/ai/*
    │   ├── reviews.py              ← /api/reviews/*
    │   ├── weather.py              ← /api/weather
    │   └── admin.py                ← /api/admin/*
    │
    ├── services/                   ← Бизнес-логика
    │   ├── __init__.py
    │   ├── ai_service.py           ← AI рекомендации (Rule + GPT-4o-mini)
    │   ├── weather_service.py      ← OpenWeatherMap API
    │   ├── payment_service.py      ← Kaspi QR / CloudPayments
    │   └── sms_service.py          ← SMS OTP через smsapi.kz
    │
    └── utils/
        ├── __init__.py
        └── auth.py                 ← JWT токены, декораторы @login_required
```

### Применённые паттерны (для диплома)

| Паттерн | Файл | Описание |
|---------|------|---------|
| **Application Factory** | `app/__init__.py` | `create_app()` создаёт приложение |
| **Blueprint** | `app/routes/*.py` | Группировка маршрутов по функциям |
| **Service Layer** | `app/services/*.py` | Бизнес-логика отделена от routes |
| **Repository (ORM)** | `app/models/*.py` | Доступ к БД через SQLAlchemy |
| **Decorator** | `app/utils/auth.py` | `@login_required`, `@admin_required` |
| **Factory Method** | `app/services/payment_service.py` | Создание разных типов платежей |

---

## 🚀 Запуск с нуля

### 1. Backend (PyCharm)

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv

# Активировать (Windows)
venv\Scripts\activate

# Активировать (Mac/Linux)
source venv/bin/activate

# Установить зависимости
pip install -r requirements.txt

# Вставить OpenAI ключ в .env файл:
# OPENAI_API_KEY=sk-ваш-ключ

# Запустить
python run.py
```

Сервер запустится на `http://localhost:5000`
Таблицы PostgreSQL создадутся автоматически при первом запуске.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Сайт: `http://localhost:3000/ru`

### 3. Шрифты (Cabinet Grotesk)

Скачайте бесплатно: https://www.fontshare.com/fonts/cabinet-grotesk

Положите файлы в `frontend/public/fonts/`:
- `CabinetGrotesk-Medium.woff2`
- `CabinetGrotesk-Bold.woff2`
- `CabinetGrotesk-Extrabold.woff2`

---

## 🔑 Данные для входа

| Роль | Телефон | OTP код |
|------|---------|---------|
| Admin | +77000000000 | 123456 |
| User (любой) | Любой номер | 123456 |

---

## 🌐 API Endpoints

| Метод | URL | Описание |
|-------|-----|---------|
| POST | `/api/auth/send-otp` | Отправить SMS код |
| POST | `/api/auth/verify-otp` | Проверить код → JWT токен |
| GET | `/api/auth/me` | Данные текущего пользователя |
| GET | `/api/equipment/categories` | Список категорий |
| GET | `/api/equipment` | Каталог с фильтрами |
| GET | `/api/equipment/:slug` | Карточка снаряжения |
| GET | `/api/equipment/featured` | Рекомендуемые (главная) |
| POST | `/api/equipment/availability` | Проверить наличие на даты |
| POST | `/api/bookings` | Создать бронирование |
| GET | `/api/bookings/my` | Мои бронирования |
| DELETE | `/api/bookings/:id` | Отменить бронирование |
| POST | `/api/payments/kaspi/init` | Создать Kaspi QR |
| GET | `/api/payments/:id/status` | Статус оплаты |
| POST | `/api/recommendations` | AI рекомендации |
| GET | `/api/recommendations/related` | Часто берут вместе |
| POST | `/api/ai/chat` | Чат с GPT-4o-mini |
| GET | `/api/weather` | Текущая погода |
| GET | `/api/reviews/:equipment_id` | Отзывы о снаряжении |
| GET | `/api/admin/stats` | Статистика (admin) |
| GET | `/api/admin/bookings` | Все брони (admin) |
| PATCH | `/api/admin/bookings/:id` | Изменить статус (admin) |

---

## ⚙️ Переменные окружения (.env)

```env
DATABASE_URL=postgresql://peakrent-kz:Erasil2004@localhost:5433/peakrent-kz
OPENAI_API_KEY=sk-...           # Обязательно для AI рекомендаций
OPENAI_MODEL=gpt-4o-mini
OPENWEATHER_API_KEY=            # Необязательно (погода)
DEV_OTP_BYPASS=true             # true = OTP всегда "123456"
```

---

## 🤖 AI Архитектура (для диплома)

```
POST /api/recommendations
         │
         ▼
   WeatherService          ← Получаем погоду в Алматы (если не передана)
         │
         ▼
   AIService.get_recommendations()    ← L0: Rule-Based Engine (<50ms)
         │
         │  Формула скоринга:
         │  score = tag_overlap * 0.60   (совпадение тегов)
         │        + popularity  * 0.25   (популярность за 30 дней)
         │        + seasonal    * 0.10   (пиковый сезон)
         │        + featured    * 0.05   (бонус)
         │        - history_pen          (штраф за недавно арендованное)
         │
         ▼
   AIService.enrich_with_openai()    ← L1: GPT-4o-mini (персональные объяснения)
         │
         ▼
   JSON ответ с рекомендациями
```

---

## 📦 Технологический стек

### Backend
- **Flask 3.1** — веб-фреймворк
- **SQLAlchemy** — ORM (Object-Relational Mapping)
- **PostgreSQL** — реляционная БД
- **PyJWT** — JWT авторизация
- **OpenAI** — GPT-4o-mini для AI рекомендаций

### Frontend
- **Next.js 14** — React фреймворк (SSR + App Router)
- **TypeScript** — строгая типизация
- **Tailwind CSS** — утилитарные стили
- **Zustand** — управление состоянием
- **React Query** — кэширование API запросов
- **next-intl** — интернационализация (RU / KK / EN)
