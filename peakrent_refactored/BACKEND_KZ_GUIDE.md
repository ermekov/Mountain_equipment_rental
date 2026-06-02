# PeakRent.kz Backend Guide

Бұл құжат PeakRent.kz жобасының backend бөлігін қазақша, қарапайым тілмен түсіндіру үшін жазылды.  
Мақсатым: сен Python-ды базалық деңгейде білсең де, осы backend кодын түсініп, диплом қорғауда сенімді жауап бере алатын деңгейге жеткізу.

---

## 1. Backend деген не?

Қарапайым тілмен айтсақ:

- `frontend` — қолданушы көретін бет
- `backend` — сол беттің артындағы логика
- `database` — ақпарат сақталатын орын

PeakRent.kz жобасында backend-тің міндеті:

- қолданушыны тіркеу және жүйеге кіргізу
- каталогтағы жабдықтарды беру
- бронь жасау
- төлем логикасын басқару
- AI recommendation логикасын іске қосу
- админ мен менеджер панеліне дерек беру
- пікірлерді, таңдаулыларды, аналитиканы сақтау

Яғни backend — жобаның “миы”.

---

## 2. Технологиялық стек

Backend келесі технологиялармен жазылған:

- `Python`
- `Flask`
- `SQLAlchemy`
- `PostgreSQL`
- `JWT`
- `OpenAI API`
- `OpenWeatherMap API`
- `SMTP / Email`

### Қысқаша мағынасы

- `Flask` — веб-сервер және API жазуға арналған жеңіл Python framework
- `SQLAlchemy` — Python объектілері арқылы базаға жұмыс істеуге мүмкіндік беретін ORM
- `PostgreSQL` — негізгі база
- `JWT` — login болған қолданушыны тану үшін токен
- `OpenAI API` — AI recommendation және AI chat үшін
- `OpenWeatherMap` — ауа райын алу үшін
- `SMTP` — email OTP және email notification үшін

---

## 3. Жобаның backend құрылымы

Backend папкасының негізгі құрылымы:

```text
backend/app/
  __init__.py
  config.py
  extensions.py
  seed.py
  models/
  routes/
  services/
  utils/
```

### Әр папка не үшін керек

#### `app/__init__.py`
Бұл — backend-ті жинайтын негізгі файл.

Ол:

- Flask app жасайды
- config жүктейді
- SQLAlchemy мен CORS-ты қосады
- барлық `blueprint`-тарды тіркейді
- `db.create_all()` арқылы таблицалар құрады
- `seed_database()` арқылы бастапқы тест деректерін толтырады

Қорғауда айтатын сөйлем:

> Backend application factory pattern арқылы жиналады. Яғни `create_app()` функциясы серверді конфигурациялап, extension-дарды қосып, маршруттарды тіркеп, соңында дайын Flask қолданбасын қайтарады.

---

#### `config.py`
Мұнда барлық баптаулар бар:

- `SECRET_KEY`
- `JWT_SECRET`
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `WEATHER_KEY`
- `SMTP_*`
- `KASPI_*`

Маңыздысы:

- production-та мұндай кілттер кодтың ішінде емес, `.env` ішінде болуы керек
- бұл файл backend-тің сыртқы сервистермен қалай сөйлесетінін анықтайды

Қорғауда:

> Конфигурация логикасы бір файлға шығарылған. Бұл қауіпсіздік пен икемділікті арттырады, себебі development және production параметрлерін бөлек басқаруға болады.

---

#### `extensions.py`
Бұл жерде Flask extension-дар құрылады:

- `db = SQLAlchemy()`
- `cors = CORS()`

Неге бөлек файлда?

Себебі cyclic import болмас үшін.

Мысалы:

- model-дерге `db` керек
- app-ке де `db` керек

Сондықтан `db`-ны бөлек шығарып қойған.

---

#### `models/`
Мұнда база структурасы сипатталады.

Яғни қай таблицада қандай өрістер бар, қандай байланыстар бар — бәрі осы жерде.

---

#### `routes/`
Мұнда API endpoint-тер жазылған.

Мысалы:

- `/api/auth/*`
- `/api/equipment/*`
- `/api/bookings/*`
- `/api/payments/*`

Frontend дәл осы route-тарға сұраныс жібереді.

---

#### `services/`
Мұнда күрделірек бизнес логика жеке класс немесе функция ретінде жазылған.

Мысалы:

- AI recommendation
- weather
- email
- SMS
- payment
- site chat

Бұл жақсы практика, себебі route файлдар тым “ауыр” болып кетпейді.

---

#### `utils/`
Көмекші логика.

Қазір ең маңыздысы:

- `utils/auth.py`

Бұл жерде JWT токен жасау, тексеру және role-based decorator-лар орналасқан.

---

## 4. Application factory қалай жұмыс істейді?

`app/__init__.py` ішіндегі негізгі flow:

1. `Flask(__name__)` жасалады
2. `app.config.from_object(Config)` арқылы баптаулар жүктеледі
3. `db.init_app(app)` орындалады
4. `cors.init_app(...)` орындалады
5. барлық blueprint тіркеледі
6. `db.create_all()` арқылы кестелер жасалады
7. `seed_database()` шақырылады

Маңызды ой:

Backend бірден барлық route-тармен және база байланысымен көтеріліп шығады.

---

## 5. Негізгі модельдер

Backend-тің өзегі — модельдер.

### 5.1 `User`

Файл: `backend/app/models/user.py`

Негізгі өрістер:

- `id`
- `phone`
- `name`
- `email`
- `password`
- `role`
- `created_at`

Бұл модель жүйедегі барлық адамды сипаттайды:

- `user` — кәдімгі клиент
- `manager` — менеджер
- `admin` — админ

### Неге `phone` те, `email` де бар?

Себебі жүйеде екі түрлі auth flow бар:

- клиенттер — көбіне OTP/email/phone flow
- manager/admin — email + password

### Байланыстары

- бір user-де көп booking болады
- бір user-де көп review болады
- бір user-де көп favorite болады

Қорғауда:

> User моделі көп рөлді архитектураны қолдайды. Бір модель ішінде клиент, менеджер және администратор сақталады, ал қолжетімділік role арқылы шектеледі.

---

### 5.2 `OTPCode`

Бұл — бір реттік код.

Өрістері:

- `phone` (іс жүзінде identifier ретінде email/phone сақталуы мүмкін)
- `code`
- `expires_at`
- `used`

Логикасы:

1. қолданушы код сұрайды
2. OTP базаға жазылады
3. қолданушы код енгізеді
4. код тексеріледі
5. `used=True` болады

Маңыздысы:

- код қайта қолданылмайды
- TTL бар

---

### 5.3 `Category`

Жабдық категориялары:

- skiing
- snowboard
- hiking
- camping
- climbing
- trekking

Өрістері:

- `slug`
- `name_ru`
- `name_kk`
- `name_en`
- `icon`
- `sort_order`

Бұл модель каталогты логикалық бөлу үшін керек.

---

### 5.4 `Equipment`

Бұл — ең маңызды модельдердің бірі.

Өрістері:

- `slug`
- `category_id`
- `name_ru`, `name_kk`, `name_en`
- `description_ru`, `description_kk`, `description_en`
- `price_per_day`
- `deposit_amount`
- `stock`
- `images`
- `tags`
- `sizes`
- `peak_months`
- `size_type`
- `gender`
- `is_active`
- `is_featured`

### Неге `images`, `tags`, `sizes`, `peak_months` JSON ретінде сақталған?

Себебі ол өрістер массив сияқты:

- бірнеше сурет
- бірнеше tag
- бірнеше размер
- бірнеше ай

PostgreSQL-де оны бөлек кесте қылуға да болатын еді, бірақ бұл жерде жеңілдетілген архитектура таңдалған.

### `available_stock(start_date, end_date)` не істейді?

Бұл функция rental жобада өте маңызды.

Ол:

- осы товардың жалпы `stock` санын алады
- сол күндерге сәйкес келетін `pending` және `confirmed` броньдарды санайды
- қолжетімді қалдықты есептейді

Формуласы:

```text
available = total_stock - booked_on_dates
```

Сондықтан:

- 7 дана товар болса
- бір клиент 1 данасын сол күндерге алса
- екінші клиентке тек 6 ғана қалады

Бұл логика сенің жобаңда бар.

### `to_dict()` не үшін керек?

Frontend JSON күтеді.  
Сондықтан SQLAlchemy объектісін API-ге ыңғайлы словарьға айналдырады.

---

### 5.5 `Booking`

Бұл — броньдың өзі.

Өрістері:

- `user_id`
- `start_date`
- `end_date`
- `total_price`
- `status`
- `payment_method`
- `kaspi_order_id`
- `confirmed_at`
- `created_at`
- `notes`

### `status`

Негізгі статустар:

- `pending`
- `confirmed`
- `completed`
- `cancelled`

### `booking_number`

Бұл — әдемі нөмір:

```text
PR-2026-00001
```

Ол қорғауда жақсы көрінеді, себебі “ішкі ID” емес, business-friendly нөмір.

### `days`

Rental ұзақтығын есептейді:

```python
(end_date - start_date).days
```

---

### 5.6 `BookingItem`

Booking-тің ішіндегі нақты позиция.

Мысалы бір броньда:

- шаңғы
- шлем
- күртеше

болса, олардың әрқайсысы `BookingItem`.

Өрістері:

- `booking_id`
- `equipment_id`
- `quantity`
- `size`
- `price_per_day`
- `subtotal`

Неге жеке кесте керек?

Себебі бір броньда бірнеше товар болуы мүмкін.

Бұл — дұрыс relational модель.

---

### 5.7 `Review`

Өрістері:

- `user_id`
- `equipment_id`
- `booking_id`
- `rating`
- `comment`
- `created_at`

Маңызды логика:

- тек шын бронь жасаған адам ғана review жаза алады
- бір user бір товарға бір рет қана жазады

Бұл verified review логикасы.

---

### 5.8 `Favorite`

Өрістері:

- `user_id`
- `equipment_id`
- `created_at`

Маңыздысы:

- бұл local storage емес
- базаға сақталады
- user қайта кірсе де favorite жоғалмайды

---

## 6. Аутентификация қалай жұмыс істейді?

Файлдар:

- `routes/auth.py`
- `utils/auth.py`

### JWT логикасы

Login болғаннан кейін backend `JWT` токен жасайды.

Токен ішінде:

- `user_id`
- `role`
- `exp`

сақталады.

Frontend кейін әр сұранысқа:

```text
Authorization: Bearer <token>
```

жібереді.

### Decorator-лар

#### `@login_required`
Қолданушы міндетті түрде login болуы керек.

#### `@optional_auth`
Login болса — user анықталады, болмаса да route жұмыс істейді.

#### `@manager_required`
Тек manager немесе admin.

#### `@admin_required`
Тек admin.

Қорғауда:

> Backend role-based access control қолданады. Яғни route деңгейінде decorator арқылы қай рөл қай endpoint-ке кіре алатыны шектелген.

---

## 7. Auth route-тарының логикасы

### `POST /api/auth/send-otp`

Мақсаты:

- email не phone-ға бір реттік код жіберу

Логика:

1. email/phone қабылдайды
2. валидтейді
3. OTP жасайды
4. ескі пайдаланылмаған кодтарды өшіреді
5. жаңа кодты базаға жазады
6. email немесе SMS арқылы жібереді

### `POST /api/auth/verify-otp`

Мақсаты:

- OTP-ні тексеру
- user табу немесе жасау
- JWT беру

### `POST /api/auth/register`

Мақсаты:

- email, phone, password арқылы тіркеу

Логика:

- код тексеріледі
- user duplicate емес пе тексеріледі
- password hash жасалады
- JWT беріледі

### `POST /api/auth/login`

Мақсаты:

- email/phone + password арқылы кіру

### `GET /api/auth/me`

Мақсаты:

- ағымдағы login user-ді қайтару

### `PUT /api/auth/me`

Мақсаты:

- профильдегі `name` өзгерту

---

## 8. Каталог және equipment логикасы

Файл: `routes/equipment.py`

### Негізгі route-тар

#### `GET /api/equipment/categories`
Барлық категория тізімін береді.

#### `GET /api/equipment/featured`
Басты беттегі featured товарлар.

#### `GET /api/equipment`
Негізгі каталог.

Фильтрлер:

- `category`
- `search`
- `min_price`
- `max_price`
- `gender`
- `sort`
- `limit`
- `start_date`
- `end_date`

### Неге `start_date`, `end_date` керек?

Себебі каталогта жай stock емес, нақты сол күндерге қолжетімді stock көрсетуге болады.

Яғни rental жүйесіне сай.

### Gender filter

Қазір backend логикасы:

- `male` → `male + unisex`
- `female` → `female + unisex`
- `unisex` → тек `unisex`

Бұл UX жағынан дұрыс, себебі универсал товарларды да көрсетеді.

### `GET /api/equipment/<slug>`

Бір товардың толық карточкасы.

### `POST /api/equipment/availability`

Бірнеше товардың нақты күндерге availability-сын тексереді.

Frontend мұны дата таңдағанда қолдана алады.

### Favorites route-тары

- `GET /favorites`
- `POST /<id>/favorite`
- `DELETE /<id>/favorite`

Бұл profile-дегі favorite функционалын қоректендіреді.

---

## 9. Booking логикасы

Файл: `routes/bookings.py`

### `POST /api/bookings`

Бұл — бронь жасаудың негізгі route-ы.

### Жұмыс реті

1. `items`, `start_date`, `end_date`, `payment_method` тексеріледі
2. күн форматы тексеріледі
3. `end_date > start_date` тексеріледі
4. өткен күнге бронь жасалмайды
5. әр товар үшін:
   - товар бар ма
   - актив пе
   - саны жеткілікті ме
6. subtotal есептеледі
7. total есептеледі
8. booking жасалады
9. booking item-дер жасалады
10. commit орындалады
11. email notification жіберіледі

### Баға формуласы

Әр item үшін:

```text
subtotal = price_per_day × days × quantity
```

Сосын бәрі қосылады.

### Insurance

Егер `with_insurance=True` болса:

```text
1500 × days × total_items
```

қосылады.

### Маңызды

Қазір checkout міндетті түрде login-мен жүреді, себебі route `@login_required`.

Яғни аккаунтсыз checkout жабылған.

Қорғауда:

> Бронь жасау кезінде backend тек сұранысты қабылдап қана қоймайды, бизнес-валидация жасайды: күндерді тексереді, қолжетімді stock-ты есептейді, бағаны шығарады және содан кейін ғана броньды базаға сақтайды.

---

### `GET /api/bookings/my`

Тек өзінің броньдарын береді.

### `GET /api/bookings/<id>`

Нақты бір бронь.

Қауіпсіздік:

- user тек өзінің бронін көреді
- admin бәрін көре алады

### `DELETE /api/bookings/<id>`

Броньды cancel жасау.

Тек:

- `pending`
- `confirmed`

статустарында ғана рұқсат.

---

## 10. Төлем логикасы

Файлдар:

- `routes/payments.py`
- `services/payment_service.py`

### Жалпы идея

Қазір жүйеде payment flow бар, бірақ Kaspi production API емес, demo архитектура қолданылады.

### Қалай жұмыс істейді

#### `POST /api/payments/kaspi/init`

Frontend checkout-тен payment init жібереді.

Backend:

1. booking немесе booking-терді табады
2. total amount есептейді
3. `PaymentService.create_kaspi_qr(...)` шақырады
4. `payment_id` қайтарады
5. booking-ке `kaspi_order_id` жазады

### Неге қазір “бірнеше booking → бір payment” бар?

Себебі cart-те әр товардың өз күні болуы үшін, checkout бірнеше booking жасай алады.  
Бірақ user-ге бір ғана QR көрсету ыңғайлы.

Сондықтан:

- backend бірнеше booking-ті бір `payment_id`-ға байлайды
- user бір QR арқылы бәрін төлейді

Бұл — өте маңызды архитектуралық шешім.

Қорғауда:

> Әр позицияның rental period-і жеке болуы үшін, checkout кезеңінде бірнеше booking жасалады. Бірақ payment қабаты оларды бір ортақ payment session-ға біріктіреді. Нәтижесінде бизнес логика да сақталады, UX те ыңғайлы болады.

### `GET /api/payments/<payment_id>/status`

Frontend polling жасайды.

Қазір demo режимінде:

- 20 секундтан кейін `confirmed` болып кетеді

Production-та мұны webhook не provider status API алмастыруы керек.

### `POST /api/payments/kaspi/webhook`

Kaspi production-та төлем жасалғанын backend-ке хабарлайды.

Қазір бұл route дайын тұр, бірақ full production security емес.

### `PaymentService`

`payment_service.py` ішінде:

- `create_kaspi_qr()`
- `create_card_payment()`
- `verify_kaspi_webhook_signature()`

бар.

Қазір `create_kaspi_qr()` шын QR емес, demo SVG генерациялайды.

Сондықтан қорғауда шындықты айту керек:

> Қазіргі нұсқада төлем интеграциясы demo деңгейінде, бірақ payment init, status polling, webhook-ready архитектурасы дайын.

### Ескерту

Frontend-те `cash` опциясы алынып тасталған. Бірақ backend-та `create_booking()` ішінде `cash` үшін ескі тармақ әлі қалған.  
Бұл — legacy логика, кейін толық тазартуға болады.

---

## 11. AI recommendation логикасы

Файлдар:

- `routes/recommendations.py`
- `services/ai_service.py`
- `services/weather_service.py`

### Ең маңызды түсінік

Сенің жобада AI recommendation — pure LLM емес.  
Бұл — `hybrid system`.

Яғни 2 қабат бар:

1. `rule-based selection`
2. `OpenAI explanation layer`

---

### 11.1 Recommendation route

`POST /api/recommendations`

Қабылдайтындары:

- `activity`
- `city`
- `level`
- `limit`
- `budget_max`
- `start_date`
- `end_date`
- `temperature`
- `weather`
- `locale`

Егер `temperature/weather` берілмесе:

- `WeatherService.get_current(city)` шақырылады

Содан кейін:

- `AIService.get_recommendations(...)`
- `AIService.enrich_with_openai(...)`

орындалады.

---

### 11.2 `AIService.get_recommendations()`

Бұл функция нақты жабдықтарды іріктейді.

Қадамдары:

1. барлық актив товарларды алады
2. activity/temperature/weather/level бойынша `target_tags` жасайды
3. popularity есептейді
4. recently rented history penalty қарайды
5. seasonal bonus береді
6. stock availability қарайды
7. budget penalty қарайды
8. score шығарады
9. ең мықты item-дерді қайтарады

### Score компоненттері

Кодтағы негізгі факторлар:

- `tag_overlap`
- `popularity_score`
- `seasonal_bonus`
- `featured_bonus`
- `stock_bonus`
- `safety_bonus`
- `history_penalty`
- `budget_penalty`

Қарапайым тілмен:

- user сұрауына қаншалықты сәйкес
- қаншалықты сұраныста
- маусымға сай ма
- қазір бос па
- қауіпсіздікке пайдалы ма

---

### 11.3 OpenAI не істейді?

`enrich_with_openai()` негізгі shortlist-ті алып, әр товарға түсіндірме жазады.

OpenAI-ға:

- activity
- city
- weather
- temperature
- shortlist item-дер

беріледі.

OpenAI-дың міндеті:

- неге дәл осы товар
- бір safety/comfort hint
- next step

Яғни OpenAI:

- негізгі ranking жасамайды
- inventory-ді өзі ойлап таппайды
- rule-based нәтижені “адамға түсінікті” етіп түсіндіреді

Бұл қорғауда өте күшті аргумент.

Дайын сөйлем:

> Recommendation жүйесі гибридті тәсілмен құрылған: алдымен бизнес логика нақты каталог ішінен ең лайықты позицияларды таңдайды, содан кейін OpenAI сол таңдауды персоналданған табиғи тілде түсіндіреді.

---

### 11.4 `AIService.chat()`

Бұл `/api/ai/chat` логикасы.

Мұнда AI:

- user message history-ін алады
- profile/context extract жасайды
- catalog context жинайды
- OpenAI-ға system prompt береді

Нәтижеде AI чат:

- тек жалпы сөйлеспейді
- нақты каталогқа сүйенеді
- бос inventory-ге жақын ұсыныс береді

---

### 11.5 `AIService.suggest()`

Қысқа 3 сөйлемдік кеңес.

Мысалы:

- “skiing үшін не алу керек?”
- “camping-ке не керек?”

---

### 11.6 `WeatherService`

Ауа райын OpenWeatherMap-тан алады.

Егер API жоқ болса:

- default weather қайтарады

Бұл fail-safe логика.

Қорғауда:

> Ауа райы recommendation сапасын көтеру үшін пайдаланылады. Егер сыртқы API жауап бермесе, жүйе demo/fallback мәндермен жұмысын тоқтатпай жалғастырады.

---

## 12. Site chat бөлігі

Файл: `services/chat_service.py`

Бұл recommendation AI-дан бөлек.

Мақсаты:

- сайт бойынша көмек беру
- “қалай бронь жасаймын?”
- “қайдан аламын?”
- “бағасы қайда?”

Сонда 2 түрлі AI бар:

1. `AI recommendation`
2. `site assistant chat`

Айырмасы:

- recommendation — gear selection
- site assistant — navigation + FAQ

---

## 13. Review жүйесі

Файл: `routes/reviews.py`

### `GET /api/reviews/<equipment_id>`

Соңғы review-лерді береді.

### `POST /api/reviews`

Review жазу логикасы:

1. user login болуы керек
2. `equipment_id` міндетті
3. rating 1–5 аралығы болуы керек
4. user бұрын review жазды ма тексеріледі
5. user бұл товарды шынымен брондады ма тексеріледі
6. тек confirmed/completed booking болса ғана review жазылады

Бұл өте дұрыс бизнес логика.

Қорғауда:

> Review жүйесі verified review принципімен жасалған. Яғни тек осы жабдықты нақты брондаған клиент қана пікір қалдыра алады.

---

## 14. Admin және manager бөлігі

Файл: `routes/admin.py`

### 14.1 Admin login

`POST /api/admin/login`

Manager мен admin екеуі де:

- email
- password

арқылы кіреді.

Role арқылы frontend қай бетке жіберетінін шешеді:

- admin → `/admin`
- manager → `/manager`

---

### 14.2 Analytics

Endpoint-тер:

- `/analytics/summary`
- `/analytics/top-products`
- `/analytics/top-users`
- `/analytics/daily-revenue`
- `/analytics/export`

Backend мұнда:

- confirmed booking-тер бойынша revenue есептейді
- top products шығарады
- top users шығарады
- күндік revenue графигіне дерек қайтарады
- CSV export жасайды

Маңыздысы:

сенің analytics backend-і жай “сан қайтару” емес, нақты агрегаттар жасайды.

---

### 14.3 Booking management

Manager/Admin:

- барлық booking-ті көре алады
- status өзгерте алады
- note қоса алады

`PATCH /api/admin/bookings/<id>`

арқылы:

- `pending`
- `confirmed`
- `completed`
- `cancelled`

арасында ауыстырады.

Status өзгерсе email notification кетеді.

---

### 14.4 Users

`GET /api/admin/users`

Manager де, admin да қарай алады.

Backend әр user-ге:

- booking count
- active bookings

сияқты статистика қосып береді.

---

### 14.5 Product management

Admin:

- товар тізімі
- image upload
- product create
- product update
- soft delete

жасай алады.

### Product create кезінде не тексеріледі?

- `name`
- `category_id`
- `price`
- `deposit`
- `stock`
- `size_type`
- `gender`
- `tags`
- `sizes`
- `peak_months`

Яғни backend-та валидация жақсы қойылған.

---

## 15. Seed логикасы

Файл: `seed.py`

Жоба бірінші көтерілгенде:

- категориялар жасалады
- негізгі товарлар жасалады
- admin user жасалады
- manager user жасалады

Қазіргі seed аккаунттар:

- `admin@peakrent.kz / admin123`
- `manager@peakrent.kz / manager123`

Маңызды:

`seed_database()` тек база бос болса ғана жұмыс істейді.

---

## 16. Request flow мысалдары

### Мысал 1. Қолданушы каталог ашады

1. Frontend `GET /api/equipment`
2. Backend filter-лерді оқиды
3. Equipment query құралады
4. `to_dict()` арқылы JSON қайтарады

### Мысал 2. Қолданушы бронь жасайды

1. Frontend checkout-тен `POST /api/bookings`
2. Backend күндерді, stock-ты, item-дерді тексереді
3. Booking жасайды
4. BookingItem-дер жасайды
5. Total сақталады
6. JSON response қайтарады

### Мысал 3. Қолданушы Kaspi QR төлейді

1. Frontend `POST /api/payments/kaspi/init`
2. Backend booking/booking-терді табады
3. Payment session жасайды
4. QR береді
5. Frontend polling жасайды
6. Статус paid болса success-қа өтеді

### Мысал 4. AI recommendation

1. Frontend `/api/recommendations`
2. Backend weather/context жинайды
3. Rule-based shortlist жасайды
4. OpenAI explanation қосады
5. Result frontend-ке кетеді

---

## 17. Қауіпсіздік жағынан не бар?

Бар нәрселер:

- JWT auth
- role-based access
- route decorator protection
- OTP verification
- password hash
- verified reviews
- booking access check

Бірақ жақсартуға болатын жерлер:

- config ішінде default secret/key қалмауы керек
- webhook signature production-та міндетті
- rate limiting жоқ
- audit logging күшейтуге болады

Қорғауда honest жауап:

> Жүйеде негізгі қауіпсіздік қабаттары бар: JWT, role-based access, password hashing және verified action checks. Бірақ production деңгейінде secret management, webhook verification және rate limiting сияқты қосымша шаралар қажет.

---

## 18. Қазір backend-те қандай маңызды ерекшеліктер бар?

### 1. Rental-ға бейімделген stock логикасы
Жай ecommerce емес, нақты күндерге availability есептейді.

### 2. AI recommendation гибридті
Rule-based + OpenAI explanation.

### 3. Multi-role architecture
User / manager / admin.

### 4. Analytics бар
Күндік revenue, top products, top users, CSV export.

### 5. Verified review бар
Кез келген адам review жаза алмайды.

### 6. Favorite жүйесі бар
Базаға сақталады.

### 7. Payment architecture дайын
Demo болса да payment flow дұрыс бөлінген.

---

## 19. Қорғауда жиі қойылатын сұрақтар және дайын жауаптар

### Сұрақ: Неге Flask таңдадың?

Жауап:

> Flask жеңіл, түсінікті және REST API жазуға өте қолайлы. Бұл жоба үшін бізге күрделі full-stack framework емес, модульдік және басқаруға ыңғайлы backend керек болды. Flask соған дәл келді.

### Сұрақ: SQLAlchemy не үшін керек?

Жауап:

> SQLAlchemy ORM база таблицаларымен Python объектілері сияқты жұмыс істеуге мүмкіндік береді. Бұл кодты таза, оқуға жеңіл және қолдауға ыңғайлы етеді.

### Сұрақ: Неге booking пен booking item бөлек?

Жауап:

> Бір броньда бірнеше товар болуы мүмкін. Сондықтан booking — жалпы тапсырыс, ал booking item — соның ішіндегі нақты позициялар.

### Сұрақ: Stock қалай бақыланады?

Жауап:

> Әр товар үшін `available_stock(start_date, end_date)` функциясы бар. Ол сол күндерге сәйкес келетін белсенді броньдарды есептеп, нақты бос қалдықты қайтарады.

### Сұрақ: AI recommendation қалай жұмыс істейді?

Жауап:

> Алдымен жүйе activity, weather, temperature, season, popularity және availability бойынша нақты товарларға score есептейді. Содан кейін OpenAI сол shortlist-ті пайдаланушыға түсінікті етіп түсіндіреді.

### Сұрақ: OpenAI бәрін өзі таңдай ма?

Жауап:

> Жоқ. Негізгі таңдау business logic арқылы жасалады. OpenAI explanation layer ретінде қолданылады.

### Сұрақ: Review неге бәріне ашық емес?

Жауап:

> Себебі fake review болмас үшін verified review логикасы жасалды. Тек осы жабдықты шынымен брондаған клиент қана пікір жаза алады.

### Сұрақ: Payment шынайы ма?

Жауап:

> Қазіргі нұсқада payment flow demo режимінде. Бірақ payment init, status polling және webhook-ready архитектурасы шынайы интеграцияға дайын.

### Сұрақ: Неге role-based access керек болды?

Жауап:

> Себебі клиент, менеджер және админнің функциялары әртүрлі. Клиент өз бронін көреді, менеджер броньдарды басқарады, ал админ аналитика мен товарларды да басқарады.

### Сұрақ: Неге seed керек?

Жауап:

> Seed development ортасында жүйені тез іске қосу үшін керек. Ол категориялар, тест товарлар және admin/manager аккаунттарын автоматты түрде толтырады.

---

## 20. Код оқуды қалай бастау керек?

Егер өзің біртіндеп түсінгің келсе, мына ретпен оқы:

### 1-қадам
`backend/app/__init__.py`

Мына сұраққа жауап бер:

- сервер қалай жиналады?

### 2-қадам
`config.py`, `extensions.py`

Мына сұрақ:

- қандай сыртқы сервистер бар?
- база қалай қосылған?

### 3-қадам
`models/`

Мына сұрақ:

- қандай таблицалар бар?
- олардың байланысы қандай?

### 4-қадам
`routes/auth.py`

Мына сұрақ:

- login/register/OTP flow қалай жүреді?

### 5-қадам
`routes/equipment.py`

Мына сұрақ:

- каталог қалай фильтрленеді?
- availability қай жерде есептеледі?

### 6-қадам
`routes/bookings.py`

Мына сұрақ:

- бронь қалай жасалады?
- баға қалай есептеледі?

### 7-қадам
`routes/payments.py`, `services/payment_service.py`

Мына сұрақ:

- payment session қалай жасалады?
- booking payment-пен қалай байланысады?

### 8-қадам
`routes/recommendations.py`, `services/ai_service.py`

Мына сұрақ:

- recommendation қалай шығады?
- OpenAI нақты не істейді?

### 9-қадам
`routes/admin.py`

Мына сұрақ:

- аналитика қалай есептеледі?
- manager/admin айырмасы қандай?

---

## 21. Саған ең маңызды 10 түсінік

Егер ертең тек ең маңыздысын есте сақтаймын десең, мынаны біл:

1. Backend Flask арқылы құрылған REST API.
2. База PostgreSQL, ORM — SQLAlchemy.
3. App `create_app()` арқылы жиналады.
4. Auth JWT арқылы жүреді.
5. Рөлдер: user / manager / admin.
6. Equipment — каталогтың негізі.
7. Booking + BookingItem — rental order моделі.
8. Stock нақты күндерге есептеледі.
9. AI recommendation — hybrid system.
10. Payment architecture бар, бірақ Kaspi әлі demo деңгейінде.

---

## 22. Қорытынды

Осы backend-тің логикасы жаман емес, керісінше диплом жобасы үшін өте жақсы деңгейде:

- құрылымы бөлінген
- route/model/service логикасы түсінікті
- rental бизнес логикасы бар
- AI қосылған
- admin/manager бөлігі бар
- аналитика бар
- favorite/review/payment сияқты толық сервис элементтері бар

Сен қорғауда backend туралы сенімді айта аласың:

> Жобаның backend бөлігі Flask негізінде REST API түрінде жасалған. Ол аутентификацияны, каталогты, броньдарды, төлем ағынын, AI recommendation логикасын, аналитиканы және рөлдік басқаруды біріктіреді. Архитектура model-route-service қағидасымен бөлінген, сондықтан кодты кеңейту және қолдау жеңіл.

---

## 23. Осы файлды қалай қолданған дұрыс?

Ұсыныс:

1. Бір рет басынан аяғына дейін оқып шық
2. Екінші рет оқығанда қатарынан код файлдарын аш
3. Әр бөлімнен кейін өз сөзіңмен 2-3 сөйлем айтып көр
4. Ең соңында 19-бөлімдегі Q&A-ны жаттығып ал

---

Егер қаласаң, келесі қадамда мен саған тағы 3 нәрсенің бірін жасап беремін:

- `backend бойынша 1 сағаттық оқу жоспары`
- `қорғауға дайын ауызша жауаптар`
- `кодтан сұрақ қойса, файл-файлмен шпаргалка`
