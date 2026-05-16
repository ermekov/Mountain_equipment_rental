from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


OUT_PATH = Path(
    r"C:\Users\Erasyl\Desktop\Mountain_rental2\peakrent_diploma\peakrent_refactored\PeakRent_diplom_qorgau_kk.docx"
)


def run_props(
    text: str,
    *,
    bold: bool = False,
    size: int = 24,
    color: str = "1F2937",
    caps: bool = False,
) -> str:
    text = escape(text)
    parts = [
        "<w:r>",
        "<w:rPr>",
        "<w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\" w:cs=\"Calibri\"/>",
        f"<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/>",
        f"<w:color w:val=\"{color}\"/>",
    ]
    if bold:
        parts.append("<w:b/><w:bCs/>")
    if caps:
        parts.append("<w:caps/>")
    parts.extend(
        [
            "</w:rPr>",
            f"<w:t xml:space=\"preserve\">{text}</w:t>",
            "</w:r>",
        ]
    )
    return "".join(parts)


def paragraph(
    *runs: str,
    align: str = "left",
    before: int = 0,
    after: int = 120,
    line: int = 300,
    keep_next: bool = False,
    page_break_before: bool = False,
) -> str:
    jc = {"left": "left", "center": "center", "right": "right", "both": "both"}[align]
    ppr = [
        "<w:pPr>",
        f"<w:jc w:val=\"{jc}\"/>",
        f"<w:spacing w:before=\"{before}\" w:after=\"{after}\" w:line=\"{line}\" w:lineRule=\"auto\"/>",
    ]
    if keep_next:
        ppr.append("<w:keepNext/>")
    if page_break_before:
        ppr.append("<w:pageBreakBefore/>")
    ppr.append("</w:pPr>")
    return "<w:p>" + "".join(ppr) + "".join(runs) + "</w:p>"


def heading(text: str, level: int) -> str:
    if level == 1:
        return paragraph(
            run_props(text, bold=True, size=30, color="0F3D5E"),
            before=220,
            after=140,
            line=320,
            keep_next=True,
        )
    return paragraph(
        run_props(text, bold=True, size=26, color="125B7D"),
        before=140,
        after=90,
        line=300,
        keep_next=True,
    )


def body(text: str) -> str:
    return paragraph(run_props(text, size=23, color="273444"), align="both", after=90, line=320)


def bullet(text: str) -> str:
    return paragraph(run_props(f"• {text}", size=23, color="273444"), align="both", after=60, line=300)


def note(text: str) -> str:
    return paragraph(
        run_props("Қорғауда айтуға болады: ", bold=True, size=22, color="0D6E6E")
        + run_props(text, size=22, color="0D6E6E"),
        align="both",
        before=30,
        after=100,
        line=300,
    )


def page_break() -> str:
    return "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"


def cell(text: str, width: int, *, bold: bool = False, fill: str | None = None) -> str:
    tcpr = [
        "<w:tcPr>",
        f"<w:tcW w:w=\"{width}\" w:type=\"dxa\"/>",
        "<w:vAlign w:val=\"center\"/>",
    ]
    if fill:
        tcpr.append(f"<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"{fill}\"/>")
    tcpr.append("</w:tcPr>")
    return (
        "<w:tc>"
        + "".join(tcpr)
        + paragraph(
            run_props(text, bold=bold, size=22 if bold else 21, color="1F2937"),
            before=30,
            after=30,
            line=280,
        )
        + "</w:tc>"
    )


def table(headers: list[str], rows: list[list[str]], widths: list[int]) -> str:
    borders = (
        "<w:tblBorders>"
        "<w:top w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"C9D4DF\"/>"
        "<w:left w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"C9D4DF\"/>"
        "<w:bottom w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"C9D4DF\"/>"
        "<w:right w:val=\"single\" w:sz=\"8\" w:space=\"0\" w:color=\"C9D4DF\"/>"
        "<w:insideH w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"DCE5EE\"/>"
        "<w:insideV w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"DCE5EE\"/>"
        "</w:tblBorders>"
    )
    grid = "".join(f"<w:gridCol w:w=\"{w}\"/>" for w in widths)
    header_row = "<w:tr>" + "".join(cell(h, widths[i], bold=True, fill="EAF2F8") for i, h in enumerate(headers)) + "</w:tr>"
    body_rows = []
    for row in rows:
        body_rows.append("<w:tr>" + "".join(cell(v, widths[i]) for i, v in enumerate(row)) + "</w:tr>")
    return (
        "<w:tbl>"
        "<w:tblPr>"
        "<w:tblW w:w=\"0\" w:type=\"auto\"/>"
        + borders
        + "<w:tblCellMar><w:top w:w=\"80\" w:type=\"dxa\"/><w:left w:w=\"100\" w:type=\"dxa\"/><w:bottom w:w=\"80\" w:type=\"dxa\"/><w:right w:w=\"100\" w:type=\"dxa\"/></w:tblCellMar>"
        + "</w:tblPr>"
        + f"<w:tblGrid>{grid}</w:tblGrid>"
        + header_row
        + "".join(body_rows)
        + "</w:tbl>"
    )


def build_document_xml() -> str:
    blocks: list[str] = []

    blocks.append(paragraph(run_props("PEAKRENT.KZ", bold=True, size=38, color="0F3D5E", caps=True), align="center", before=1200, after=120))
    blocks.append(paragraph(run_props("Дипломдық жобаны қорғауға арналған толық түсіндірме құжат", size=28, color="3B5B73"), align="center", after=220))
    blocks.append(paragraph(run_props("Тау және туристік жабдықтарды жалға беру платформасы", bold=True, size=26, color="2B7A78"), align="center", after=180))
    blocks.append(paragraph(run_props("Backend: Flask + PostgreSQL | Frontend: Next.js + TypeScript | AI + Kaspi QR + Email OTP", size=22, color="516B7B"), align="center", after=480))
    blocks.append(paragraph(run_props("Дайындалған күні: 2026 жылғы 11 мамыр", size=22, color="6B7280"), align="center", after=120))
    blocks.append(paragraph(run_props("Бұл құжат жобаның архитектурасын, функционалын, қауіпсіздігін және қорғауда айтуға болатын негізгі ойларды қамтиды.", size=22, color="6B7280"), align="center", after=220))
    blocks.append(page_break())

    blocks.append(heading("1. Кіріспе", 1))
    blocks.append(heading("1.1 Жобаның өзектілігі", 2))
    blocks.append(body("Қазіргі таңда цифрлық сервистердің дамуы адамдардың қызмет алу тәсілін түбегейлі өзгертті. Көптеген пайдаланушылар қымбат жабдықты сатып алудан гөрі, оны белгілі бір уақытқа жалға алуды тиімді көреді. Әсіресе туризм, қысқы спорт және белсенді демалыс саласында бұл мәселе өте өзекті."))
    blocks.append(body("Тау шаңғысы, сноуборд, хайкинг, треккинг немесе альпинизм сияқты белсенділіктер үшін арнайы жабдық қажет. Бірақ мұндай жабдықты әр адам сатып ала бермейді. Сондықтан қолданушыға ыңғайлы, сенімді және жылдам жұмыс істейтін жалға беру платформасын құру практикалық тұрғыдан маңызды."))
    blocks.append(body("Менің дипломдық жобам осы қажеттілікті шешуге бағытталған. Жоба Қазақстан нарығына бейімделген, көптілді интерфейсті қолдайды, онлайн бронь жасауды, төлемді, әкімшілік басқаруды, аналитиканы және AI негізіндегі ұсыныс жүйесін біріктіреді."))
    blocks.append(note("Бұл жоба нақты бизнес-процесті автоматтандырады: клиент жабдықты таңдайды, бронь жасайды, төлем жасайды, ал менеджер мен әкімші сол тапсырыстарды жүйе ішінде басқарады."))
    blocks.append(heading("1.2 Мақсаты мен міндеттері", 2))
    blocks.append(body("Жобаның негізгі мақсаты — тау және туристік жабдықтарды жалға беру процесін автоматтандыратын, клиентке де, бизнес иесіне де ыңғайлы веб-платформа жасау."))
    for item in [
        "жабдықтарды каталог түрінде көрсету;",
        "пайдаланушыны тіркеу және авторизация механизмін жасау;",
        "бронь құру, көру, өзгерту және статустарын басқару;",
        "рөлдер бойынша қолжетімділікті бөлу;",
        "онлайн төлем және растау логикасын енгізу;",
        "AI арқылы ұсыныс беру жүйесін қосу;",
        "аналитика және есеп беру модулін жүзеге асыру;",
        "email арқылы OTP және сервис хабарламаларын жіберу;",
        "көптілді интерфейс құру.",
    ]:
        blocks.append(bullet(item))

    blocks.append(heading("2. Жобаның жалпы сипаттамасы", 1))
    blocks.append(body("PeakRent.kz — бұл тау және туристік жабдықтарды жалға беруге арналған веб-платформа. Пайдаланушы сайтқа кіріп, жабдықтарды қарайды, өзіне қажетті позицияны таңдайды, жалға алу күндерін белгілейді, бронь жасайды және төлемге өте алады."))
    blocks.append(body("Жүйе тек клиенттік интерфейспен шектелмейді. Оның ішінде әкімшілік панель, менеджерлік басқару бөлігі, аналитика модулі, пікір жүйесі, көптілді интерфейс, email OTP арқылы тіркелу және бронь статустары туралы хабарлама жіберу мүмкіндіктері бар."))
    blocks.append(note("Жобаның басты ерекшелігі — бұл жай ғана каталог емес, толық rental management platform."))

    blocks.append(heading("3. Жүйенің негізгі функционалы", 1))
    for item in [
        "жабдықтар каталогы және фильтрлеу;",
        "әр жабдықтың толық карточкасы;",
        "AI ұсыныс беті және related products;",
        "қолданушының тіркелуі және кіруі;",
        "email арқылы 6 таңбалы OTP-кодпен растау;",
        "онлайн бронь жасау;",
        "Kaspi QR және төлем логикасы;",
        "пікір оқу және жазу;",
        "қолданушы профилі;",
        "admin және manager панельдері;",
        "аналитика, summary және CSV export;",
        "бронь статусы өзгергенде email уведомление жіберу.",
    ]:
        blocks.append(bullet(item))

    blocks.append(heading("4. Қолданылған технологиялар", 1))
    blocks.append(body("Жобада backend пен frontend үшін заманауи және бір-бірімен жақсы үйлесетін технологиялар қолданылды. Төмендегі кестеде олардың негізгі мақсаты көрсетілген."))
    blocks.append(table(
        ["Қабат", "Технология", "Қолданылу мақсаты"],
        [
            ["Backend", "Flask", "REST API жасау, маршруттар мен бизнес логиканы ұйымдастыру"],
            ["Backend", "SQLAlchemy", "PostgreSQL деректер қорымен ORM деңгейінде жұмыс істеу"],
            ["Backend", "PostgreSQL", "Негізгі мәліметтерді сенімді сақтау"],
            ["Backend", "JWT", "Пайдаланушыны токен арқылы аутентификациялау"],
            ["Backend", "OpenAI GPT-4o-mini", "AI ұсыныстар мен түсіндірмелер құру"],
            ["Backend", "SMTP / EmailMessage", "OTP және хабарлама хаттарын жіберу"],
            ["Frontend", "Next.js 14", "Клиенттік интерфейс пен маршруттарды құру"],
            ["Frontend", "TypeScript", "Тип қауіпсіздігі және код сапасын арттыру"],
            ["Frontend", "Tailwind CSS", "Интерфейсті жылдам және біркелкі стильде жасау"],
            ["Frontend", "Axios", "Backend API-мен байланыс орнату"],
            ["Frontend", "Zustand", "Авторизация және клиенттік күйді сақтау"],
            ["Frontend", "next-intl", "Көптілді интерфейсті ұйымдастыру"],
        ],
        [1700, 2200, 5200],
    ))
    blocks.append(note("Технологиялар өнімділікке, түсініктілікке және жобаны әрі қарай кеңейтуге ыңғайлы болуына қарай таңдалды."))

    blocks.append(heading("5. Жүйе архитектурасы", 1))
    blocks.append(heading("5.1 Жалпы құрылымы", 2))
    blocks.append(body("Жоба classic client-server архитектурасы бойынша құрылған. Frontend Next.js негізінде жұмыс істейді, backend Flask REST API түрінде жүзеге асырылған, ал барлық негізгі мәліметтер PostgreSQL деректер қорында сақталады."))
    for item in [
        "Frontend — қолданушы көретін интерфейс және беттер логикасы;",
        "Backend — бизнес логика, авторизация, бронь, аналитика және хабарламалар;",
        "Database — қолданушы, жабдық, бронь, пікір, OTP және төлемге қатысты мәліметтер.",
    ]:
        blocks.append(bullet(item))
    blocks.append(heading("5.2 Backend архитектурасы", 2))
    blocks.append(body("Backend Application Factory және Blueprint қағидасымен ұйымдастырылған. Бұл жоба құрылымын модульдерге бөліп, әр бөліктің өз жауапкершілігін нақты ажыратуға мүмкіндік береді."))
    for item in [
        "routes — REST API маршруттары;",
        "models — SQLAlchemy модельдері;",
        "services — бизнес логика, AI, төлем, email, SMS;",
        "utils — JWT, рөлдік декораторлар және көмекші функциялар.",
    ]:
        blocks.append(bullet(item))
    blocks.append(heading("5.3 Frontend архитектурасы", 2))
    blocks.append(body("Frontend Next.js App Router негізінде жасалған. Барлық негізгі беттер `locale` параметрі арқылы `ru`, `kk`, `en` тілдерін қолдайды. Компоненттер қайта қолдануға ыңғайлы етіп бөлінген, ал API сұраныстар Axios client арқылы орталықтандырылған."))
    blocks.append(heading("5.4 Қабаттар арасындағы байланыс", 2))
    blocks.append(body("Пайдаланушы интерфейсте әрекет жасаған кезде frontend backend API-ге сұраныс жібереді. Backend деректерді өңдеп, тексеріп, PostgreSQL-ден мәлімет алып немесе сақтап, JSON форматында жауап қайтарады."))
    blocks.append(note("Архитектура қабаттарға бөлінгендіктен, әр модульдің міндеті түсінікті және жүйені кейін кеңейту оңай."))

    blocks.append(heading("6. Іске асырылған функционал", 1))
    blocks.append(heading("6.1 Авторизация және тіркелу", 2))
    blocks.append(body("Жүйеде тіркелу кезінде қолданушы аты, email, телефон нөмірі және құпия сөз енгізіледі. Одан кейін email адреске 6 таңбалы бір реттік код жіберіледі. Сол код расталғаннан кейін ғана аккаунт толық тіркеледі."))
    blocks.append(body("Кіру процесі `email немесе телефон + password` логикасымен жүреді. Сәтті авторизациядан кейін backend JWT токен береді, ол қорғалған сұраныстарды орындау үшін пайдаланылады."))
    blocks.append(heading("6.2 Пайдаланушы рөлдері", 2))
    blocks.append(table(
        ["Рөл", "Мүмкіндіктері"],
        [
            ["User", "Каталог қарау, AI ұсыныс пайдалану, бронь жасау, пікір жазу, жеке броньдарын көру"],
            ["Manager", "Броньдарды көру, статусын өзгерту, клиенттерді көру"],
            ["Admin", "Тауар қосу/өңдеу/жою, бронь басқару, қолданушыларды көру, аналитика және экспорт"],
        ],
        [1700, 7200],
    ))
    blocks.append(heading("6.3 Броньдармен жұмыс", 2))
    blocks.append(body("Қолданушы бронь жасау кезінде жалға алу және қайтару күндерін таңдайды, жүйе тауардың сол күндердегі қолжетімділігін тексереді, сосын жалпы соманы есептейді. Әр броньда бірнеше тауар болуы мүмкін."))
    for item in [
        "бронь жасау;",
        "менің броньдарым бөлімінде көру;",
        "клиент тарапынан отмена жасау;",
        "admin/manager тарапынан статусын өзгерту;",
        "confirmed, pending, cancelled, completed статустарын басқару.",
    ]:
        blocks.append(bullet(item))
    blocks.append(heading("6.4 Қосымша функциялар", 2))
    for item in [
        "local image upload;",
        "AI ұсыныстар жүйесі;",
        "analytics және top products / top users;",
        "CSV export;",
        "пікір жүйесі;",
        "email арқылы бронь хабарламалары;",
        "көптілді интерфейс.",
    ]:
        blocks.append(bullet(item))

    blocks.append(heading("7. Деректер қоры", 1))
    blocks.append(body("Жобада PostgreSQL қолданылды. Деректер қоры реляциялық модельге негізделген және негізгі бизнес объектілер өзара нақты байланысқан."))
    blocks.append(table(
        ["Кесте", "Мақсаты"],
        [
            ["users", "Қолданушылар, админдер, менеджерлер туралы мәліметтер"],
            ["otp_codes", "Бір реттік email немесе телефон кодтары"],
            ["categories", "Жабдық категориялары"],
            ["equipment", "Жалға берілетін жабдықтар"],
            ["bookings", "Броньдың негізгі жазбасы"],
            ["booking_items", "Әр бронь ішіндегі нақты тауарлар"],
            ["reviews", "Пайдаланушылар қалдырған пікірлер"],
        ],
        [2200, 6700],
    ))
    blocks.append(body("Негізгі байланыстар: бір қолданушыда бірнеше бронь болады, бір броньда бірнеше booking item болады, әр booking item белгілі бір equipment-пен байланысты, ал әр equipment белгілі бір category-ге жатады."))
    blocks.append(note("Бұл модель мәліметтердің тұтастығын сақтауға және аналитика жасауға өте ыңғайлы."))

    blocks.append(heading("8. Қауіпсіздік", 1))
    blocks.append(body("Жобада қауіпсіздікке ерекше назар аударылды. Қолданушы авторизациясы JWT токендері арқылы жүреді. Құпия сөздер plain text түрде емес, хэш түрінде сақталады."))
    for item in [
        "JWT арқылы сессияны басқару;",
        "login_required, admin_required, manager_required декораторлары;",
        "рөл бойынша маршруттарға шектеу қою;",
        "email OTP арқылы тіркелуді растау;",
        "input validation: баға, қалдық, категория, deposit және басқа өрістерді тексеру;",
        "admin беттеріне тек арнайы рөлдер арқылы кіру.",
    ]:
        blocks.append(bullet(item))
    blocks.append(note("Қауіпсіздік тек кірумен шектелмейді. Жүйеде пароль хэштеу, JWT, OTP және рөлдік тексеріс бірге қолданылады."))

    blocks.append(heading("9. Пайдаланушы интерфейсі", 1))
    blocks.append(body("Интерфейс клиенттік және әкімшілік бөліктерге бөлінген. Негізгі мақсат — қолданушыға түсінікті және жылдам навигация ұсыну."))
    blocks.append(table(
        ["Бет", "Қысқаша сипаттама"],
        [
            ["Басты бет", "Жобаның таныстырылымы, каталогқа және AI ұсынысқа өту, featured өнімдер"],
            ["Каталог", "Жабдықтарды қарау, сүзгілеу, категория бойынша таңдау"],
            ["Жабдық карточкасы", "Сипаттама, бағасы, суреттері, өлшемі, related products, пікірлер"],
            ["Auth", "Тіркелу, login/password, email OTP верификациясы"],
            ["Checkout", "Бронь жасау, күн таңдау, төлемге өту"],
            ["Profile", "Пайдаланушының жеке броньдары"],
            ["Admin", "Тауарларды, қолданушыларды, броньдарды, аналитиканы басқару"],
            ["Manager", "Тапсырыстармен жұмыс істеу және статустарын өзгерту"],
        ],
        [2200, 6700],
    ))

    blocks.append(heading("10. AI функционалы", 1))
    blocks.append(body("Жобада AI recommendation модулі бар. Бұл модуль пайдаланушының белсенділік түрін, қаланы, ауа райын және кейбір қосымша факторларды ескере отырып, ең қолайлы жабдықтарды ұсынады."))
    blocks.append(body("AI модулі hybrid тәсіл қолданады. Алдымен rule-based логика арқылы жабдықтар іріктеледі, содан кейін OpenAI моделі осы ұсыныстарды түсіндіріп, ұсыныс сапасын жақсартады."))
    blocks.append(note("Бұл бөлікті қорғауда жобаның ерекше артықшылығы ретінде көрсетуге болады, себебі ол платформаны интеллектуалды жүйе ретінде танытады."))

    blocks.append(heading("11. Аналитика және есеп беру", 1))
    blocks.append(body("Админ панелде аналитика бөлімі іске асырылған. Бұл бөлім белгілі бір уақыт аралығындағы табысты, бронь санын, орташа чекті, белсенді клиенттерді, ең көп жалға алынған тауарларды және топ қолданушыларды көрсетеді."))
    for item in [
        "summary карточкалары;",
        "top products кестесі;",
        "top users кестесі;",
        "күн аралығы бойынша сүзгі;",
        "CSV export және тілге тәуелді header-лер.",
    ]:
        blocks.append(bullet(item))
    blocks.append(note("Бұл функционал жобаны бизнеске пайдалы ақпарат беретін жүйе ретінде көрсетуге мүмкіндік береді."))

    blocks.append(heading("12. Email хабарлама жүйесі", 1))
    blocks.append(body("Жобаға email notifications енгізілген. Қазіргі таңда email арқылы OTP растау коды, сондай-ақ бронь статусы туралы автоматты хабарламалар жіберіледі."))
    blocks.append(table(
        ["Оқиға", "Жіберілетін хабарлама"],
        [
            ["Тіркелу", "Email verification code"],
            ["Бронь жасалды", "Booking received"],
            ["Бронь расталды", "Booking confirmed"],
            ["Бронь жойылды", "Booking cancelled"],
            ["Бронь аяқталды", "Booking completed"],
        ],
        [2400, 6500],
    ))
    blocks.append(body("Хат ішінде бронь нөмірі, күндері, төлем тәсілі, тауарлар тізімі және қажет болса менеджер ескертпесі көрсетіледі."))

    blocks.append(heading("13. Кездескен қиындықтар және шешімдер", 1))
    blocks.append(body("Жобаны жасау барысында бірнеше практикалық қиындықтар кездесті. Оларды шешу барысында жүйенің сапасы жақсарды."))
    for item in [
        "Көптілді интерфейсте кейбір мәтіндер дұрыс шықпады — locale логикасы қайта қаралды және admin бет толық аударылды.",
        "Бастапқыда OTP тек телефонға тәуелді болды — email verification жүйесі енгізілді.",
        "SMTP қосу кезінде Gmail авторизациясы қиындық тудырды — App Password және SMTP конфигурациясы арқылы шешілді.",
        "OTP кестесіндегі өріс email үшін тар болды — деректер қоры схемасы кеңейтілді.",
        "Тауар қосу формасында category, tags, sizes сияқты өрістер жоқ болды — admin форма кеңейтіліп, backend validation күшейтілді.",
        "Analytics export-та кодировка мәселесі болды — UTF-8 BOM және locale-aware export енгізілді.",
        "Booking email template ORM объектімен жұмыс істегенде қате шықты — шаблон логикасы нақты модель құрылымына бейімделді.",
    ]:
        blocks.append(bullet(item))
    blocks.append(note("Бұл қиындықтар жобаның тәжірибелік жағын күшейтті және менің жүйелі түрде debugging пен refactoring жасағанымды көрсетеді."))

    blocks.append(heading("14. Тестілеу және тексеру", 1))
    blocks.append(body("Жоба барысында функционал код деңгейінде және интерфейс деңгейінде кезең-кезеңімен тексерілді. Негізгі маршруттар build және compile арқылы тексерілді, ал frontend пен backend интеграциясы нақты әрекеттер арқылы сыналды."))
    for item in [
        "frontend build тексерісі;",
        "backend py_compile тексерісі;",
        "email OTP жіберуін тәжірибелік тексеру;",
        "бронь құру және статус өзгерту flow-ларын тексеру;",
        "admin analytics пен export тексерісі;",
        "тауар қосу формасының validation тексерісі.",
    ]:
        blocks.append(bullet(item))

    blocks.append(heading("15. Қорытынды", 1))
    blocks.append(body("Қорытындылай келе, PeakRent.kz — бұл жалға беру бизнесінің негізгі процестерін автоматтандыратын толыққанды веб-платформа. Жобада клиенттік интерфейс, әкімшілік басқару, бронь жасау, төлемге дайындық, рөлдік жүйе, аналитика, AI ұсыныстар, email OTP және уведомление жүйесі іске асырылды."))
    blocks.append(body("Жоба тек теориялық деңгейде емес, нақты пайдалануға жақын практикалық жүйе ретінде жасалды. Оның архитектурасы кеңейтуге ыңғайлы, ал функционалы коммерциялық сервис логикасына сәйкес келеді."))
    blocks.append(note("Мен бұл жобада веб-қосымша архитектурасын, backend пен frontend байланысын, деректер қорын, рөлдік жүйені, аналитиканы және AI функционалды біріктіре алдым деп айта аламын."))

    blocks.append(heading("16. Болашақта дамыту бағыттары", 1))
    for item in [
        "SMS хабарламаларды production режимінде қосу;",
        "мобильді қосымша нұсқасын жасау;",
        "тауар атаулары мен сипаттамаларын толық 3 тілде енгізу;",
        "аналитикаға графиктер мен динамика модулін қосу;",
        "availability calendar енгізу;",
        "verified review логикасын толық жетілдіру;",
        "push notification және reminder жүйесін кеңейту.",
    ]:
        blocks.append(bullet(item))

    blocks.append(heading("17. Қорғауға арналған қысқа тезистер", 1))
    for item in [
        "Жобаның мақсаты — жалға беру процесін толық цифрландыру.",
        "Жүйе клиентке де, бизнес иесіне де ыңғайлы біртұтас платформа ретінде жасалған.",
        "Backend Flask, frontend Next.js негізінде құрылды.",
        "Авторизация JWT және email OTP арқылы қорғалған.",
        "Admin және manager рөлдері нақты бөлінген.",
        "AI ұсыныс жүйесі жобаның интеллектуалды бөлігін көрсетеді.",
        "Аналитика және email уведомление функциялары жобаның практикалық құндылығын арттырады.",
    ]:
        blocks.append(bullet(item))

    sect = (
        "<w:sectPr>"
        "<w:pgSz w:w=\"11906\" w:h=\"16838\"/>"
        "<w:pgMar w:top=\"1000\" w:right=\"1100\" w:bottom=\"1000\" w:left=\"1100\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>"
        "</w:sectPr>"
    )
    blocks.append(sect)

    body_xml = "".join(blocks)
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<w:document xmlns:wpc=\"http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas\" "
        "xmlns:mc=\"http://schemas.openxmlformats.org/markup-compatibility/2006\" "
        "xmlns:o=\"urn:schemas-microsoft-com:office:office\" "
        "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        "xmlns:m=\"http://schemas.openxmlformats.org/officeDocument/2006/math\" "
        "xmlns:v=\"urn:schemas-microsoft-com:vml\" "
        "xmlns:wp14=\"http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing\" "
        "xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" "
        "xmlns:w10=\"urn:schemas-microsoft-com:office:word\" "
        "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" "
        "xmlns:w14=\"http://schemas.microsoft.com/office/word/2010/wordml\" "
        "xmlns:wpg=\"http://schemas.microsoft.com/office/word/2010/wordprocessingGroup\" "
        "xmlns:wpi=\"http://schemas.microsoft.com/office/word/2010/wordprocessingInk\" "
        "xmlns:wne=\"http://schemas.microsoft.com/office/word/2006/wordml\" "
        "xmlns:wps=\"http://schemas.microsoft.com/office/word/2010/wordprocessingShape\" "
        "mc:Ignorable=\"w14 wp14\">"
        f"<w:body>{body_xml}</w:body></w:document>"
    )


STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="23"/>
        <w:szCs w:val="23"/>
        <w:lang w:val="kk-KZ"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="300" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>
"""


CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""


ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""


DOC_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>
"""


SETTINGS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>
"""


def core_xml() -> str:
    ts = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>PeakRent.kz дипломдық жоба сипаттамасы</dc:title>
  <dc:subject>Дипломдық жоба</dc:subject>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:keywords>PeakRent, диплом, жалға беру, web platform</cp:keywords>
  <dc:description>PeakRent.kz жобасын қорғауға арналған толық құжат</dc:description>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{ts}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{ts}</dcterms:modified>
</cp:coreProperties>
"""


APP_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>PeakRent.kz</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>
"""


def build_docx(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(path, "w", compression=ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", CONTENT_TYPES)
        zf.writestr("_rels/.rels", ROOT_RELS)
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("docProps/app.xml", APP_XML)
        zf.writestr("word/document.xml", build_document_xml())
        zf.writestr("word/styles.xml", STYLES_XML)
        zf.writestr("word/settings.xml", SETTINGS_XML)
        zf.writestr("word/_rels/document.xml.rels", DOC_RELS)


if __name__ == "__main__":
    build_docx(OUT_PATH)
    print(OUT_PATH)
