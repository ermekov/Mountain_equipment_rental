import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Clock, MapPin, Zap, Sparkles, Mountain } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { equipmentAPI } from "@/lib/api/client";
import { formatPrice } from "@/lib/utils";
import type { Locale, Equipment } from "@/lib/types";

export const metadata: Metadata = {
  title: "PeakRent — Аренда горного снаряжения в Алматы",
};

const ACTIVITIES = [
  { slug: "skiing",    icon: "⛷️", ru: "Горные лыжи",  kk: "Тау шаңғысы",  en: "Skiing"    },
  { slug: "snowboard", icon: "🏂", ru: "Сноуборд",      kk: "Сноуборд",     en: "Snowboard" },
  { slug: "hiking",    icon: "🥾", ru: "Хайкинг",       kk: "Хайкинг",      en: "Hiking"    },
  { slug: "camping",   icon: "⛺", ru: "Кемпинг",       kk: "Кемпинг",      en: "Camping"   },
  { slug: "climbing",  icon: "🧗", ru: "Альпинизм",     kk: "Альпинизм",    en: "Climbing"  },
  { slug: "trekking",  icon: "🗺️", ru: "Треккинг",      kk: "Треккинг",     en: "Trekking"  },
];

const HOW_IT_WORKS = [
  { n: "01", icon: "🔍", ru: "Выберите снаряжение",  desc_ru: "AI-подбор или каталог с фильтрами по активности и датам"       },
  { n: "02", icon: "📅", ru: "Забронируйте онлайн",  desc_ru: "Выберите даты и размер. Цена считается автоматически в тенге"  },
  { n: "03", icon: "📱", ru: "Оплатите Kaspi QR",     desc_ru: "Сканируйте QR в приложении Kaspi. Моментальное подтверждение" },
  { n: "04", icon: "🎿", ru: "Заберите и катайтесь",  desc_ru: "Покажите QR из SMS на пункте выдачи. Выдача за 5 минут"       },
];

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = locale as Locale;

  let featured: Equipment[] = [];
  try {
    featured = (await equipmentAPI.featured(6)).data;
  } catch {
    featured = [];
  }

  const actName = (a: typeof ACTIVITIES[0]) =>
    l === "kk" ? a.kk : l === "en" ? a.en : a.ru;

  const eqName = (eq: Equipment) =>
    l === "kk" ? eq.name_kk : l === "en" ? eq.name_en : eq.name_ru;

  return (
    <>
      <Navbar locale={l} />
      <main>
        {/* ════ HERO ════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[88svh] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <Image
              src="https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&auto=format&fit=crop&q=80"
              alt="Горы Казахстана"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              quality={85}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy/92 via-navy/70 to-navy/30" />
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-surface to-transparent" />
          </div>

          <div className="relative z-10 container-page py-20">
            <div className="max-w-xl">
              {/* Бейдж */}
              <div className="inline-flex items-center gap-2 bg-ice/15 border border-ice/30 rounded-full px-4 py-1.5 mb-5">
                <Zap className="w-3.5 h-3.5 text-ice" />
                <span className="text-ice text-xs font-bold uppercase tracking-wide">
                  {l === "ru" ? "С AI-рекомендациями" : l === "kk" ? "AI ұсыныстарымен" : "AI-Powered"}
                </span>
              </div>

              {/* Заголовок */}
              <h1
                className="text-white mb-4 leading-[1.05]"
                style={{ fontSize: "clamp(2rem,5vw,3.5rem)", fontWeight: 800 }}
              >
                {l === "ru" ? (
                  <>Снаряжение для<br /><span className="text-ice">горных приключений</span></>
                ) : l === "kk" ? (
                  <>Тау жабдықтарын<br /><span className="text-ice">жалдаңыз</span></>
                ) : (
                  <>Gear Up for Your<br /><span className="text-ice">Mountain Adventure</span></>
                )}
              </h1>

              <p className="text-white/70 text-base mb-7 leading-relaxed">
                {l === "ru"
                  ? "Лыжи, сноуборд, треккинг, альпинизм в Алматы. Онлайн-бронирование, оплата Kaspi QR."
                  : l === "kk"
                  ? "Шаңғы, сноуборд, хайкинг, альпинизм. Kaspi QR арқылы онлайн брондау."
                  : "Ski, snowboard, hiking, climbing in Almaty. Online booking, Kaspi QR payment."}
              </p>

              {/* Кнопки */}
              <div className="flex flex-wrap gap-3 mb-7">
                <Link href={`/${l}/catalog`} className="btn-primary !text-base !px-6 !py-3.5 group">
                  {l === "ru" ? "Смотреть каталог" : l === "kk" ? "Каталогты қарау" : "Browse Catalog"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href={`/${l}/ai`}
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white font-semibold text-base px-6 py-3.5 rounded-xl hover:bg-white/20 transition-all"
                >
                  ✨ {l === "ru" ? "AI-подбор" : l === "kk" ? "AI ұсынысы" : "AI Picks"}
                </Link>
              </div>

              {/* Иконки доверия */}
              <div className="flex flex-wrap gap-5 pt-6 border-t border-white/15">
                {[
                  { icon: <Shield className="w-4 h-4" />, t: l === "ru" ? "Страховка включена" : l === "kk" ? "Сақтандыру кіреді" : "Insurance included" },
                  { icon: <Clock  className="w-4 h-4" />, t: l === "ru" ? "Выдача 5 минут"     : l === "kk" ? "5 минутта беру" : "5-min pickup" },
                  { icon: <MapPin className="w-4 h-4" />, t: l === "ru" ? "2 пункта выдачи"    : l === "kk" ? "2 алу пункті" : "2 pickup points" },
                ].map((it, i) => (
                  <div key={i} className="flex items-center gap-2 text-white/60 text-sm">
                    <span className="text-ice/80">{it.icon}</span>{it.t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════ СТАТИСТИКА ══════════════════════════════════════════════════ */}
        <section className="bg-white border-b border-slate-100">
          <div className="container-page py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ["1 500+", l === "ru" ? "довольных клиентов"   : l === "kk" ? "риза клиент" : "happy clients"],
                ["200+",   l === "ru" ? "единиц снаряжения"    : l === "kk" ? "жабдық бірлігі" : "gear items"],
                ["4.9 ★",  l === "ru" ? "средний рейтинг"      : l === "kk" ? "орташа рейтинг" : "average rating"],
                ["24/7",   l === "ru" ? "онлайн-бронирование"  : l === "kk" ? "онлайн брондау" : "online booking"],
              ].map(([v, lbl], i) => (
                <div key={i} className="text-center">
                  <div className="font-display font-extrabold text-2xl text-navy">{v}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ АКТИВНОСТИ ═════════════════════════════════════════════════ */}
        <section className="py-14 bg-surface">
          <div className="container-page">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-navy mb-2">
                {l === "ru" ? "По виду активности" : l === "kk" ? "Белсенділік бойынша" : "By Activity"}
              </h2>
              <p className="text-slate-500 text-sm">
                {l === "ru" ? "Снаряжение под каждый горный маршрут" : l === "kk" ? "Әрбір тау бағытына сай жабдық" : "Gear for every mountain pursuit"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ACTIVITIES.map((act) => (
                <Link
                  key={act.slug}
                  href={`/${l}/catalog?category=${act.slug}`}
                  className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-200 hover:border-ice/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <span className="text-4xl transition-transform duration-300 group-hover:scale-110">
                    {act.icon}
                  </span>
                  <span className="font-display font-bold text-sm text-navy text-center">
                    {actName(act)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════ AI БАННЕР ═══════════════════════════════════════════════════ */}
        <section className="py-14 bg-navy relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "36px 36px" }}
          />
          <div className="container-page relative z-10">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-ice/15 border border-ice/30 rounded-full px-4 py-1.5 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-ice" />
                  <span className="text-ice text-xs font-bold uppercase tracking-wide">AI-рекомендатор</span>
                </div>
                <h2 className="text-white text-3xl font-extrabold mb-4 leading-tight">
                  {l === "ru" ? "Не знаете что взять?" : l === "kk" ? "Не аларыңызды білмей тұрсыз ба?" : "Not sure what to rent?"}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed mb-6">
                  {l === "ru"
                    ? "AI анализирует погоду в Алматы, вашу активность и популярность снаряжения — подбирает идеальный комплект за секунды."
                    : l === "kk"
                    ? "AI Алматыдағы ауа райын, белсенділігіңізді және жабдық танымалдығын ескеріп, лайықты жинақты ұсынады."
                    : "AI considers weather, your activity, and gear popularity to pick the perfect kit."}
                </p>
                <Link href={`/${l}/ai`} className="btn-primary !bg-ice group">
                  <Sparkles className="w-4 h-4" />
                  {l === "ru" ? "Подобрать снаряжение" : l === "kk" ? "Жабдықты таңдау" : "Get Recommendations"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-3xl p-6">
                <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-4">
                  {l === "ru" ? "Выберите активность:" : l === "kk" ? "Белсенділікті таңдаңыз:" : "Choose activity:"}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITIES.slice(0, 6).map((act) => (
                    <Link
                      key={act.slug}
                      href={`/${l}/ai?activity=${act.slug}`}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-white/20 bg-white/10 hover:bg-ice hover:border-ice text-white/80 hover:text-white text-xs font-semibold transition-all"
                    >
                      <span className="text-2xl">{act.icon}</span>
                      {actName(act)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════ ПОПУЛЯРНОЕ СНАРЯЖЕНИЕ ════════════════════════════════════════ */}
        {featured.length > 0 && (
          <section className="py-14">
            <div className="container-page">
              <div className="flex items-end justify-between mb-7">
                <div>
                  <h2 className="text-3xl font-extrabold text-navy mb-1">
                    {l === "ru" ? "Популярное снаряжение" : l === "kk" ? "Танымал жабдықтар" : "Popular Equipment"}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {l === "ru" ? "Самые востребованные позиции сезона" : l === "kk" ? "Маусымның ең сұраныстағы жабдықтары" : "Top picks this season"}
                  </p>
                </div>
                <Link href={`/${l}/catalog`} className="btn-secondary group text-sm">
                  {l === "ru" ? "Все позиции" : l === "kk" ? "Барлығын көру" : "View all"}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((eq) => {
                  const n = eqName(eq);
                  return (
                    <Link key={eq.id} href={`/${l}/equipment/${eq.slug}`} className="card-base group block">
                      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                        {eq.image_url ? (
                          <Image
                            src={eq.image_url}
                            alt={n}
                            fill
                            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl">🎿</div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className="badge-category">
                            {eq.category?.icon} {eq.category?.name_ru}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            eq.stock === 0 ? "bg-red-50 text-red-600"
                            : eq.stock <= 2 ? "bg-amber-50 text-amber-700"
                            : "bg-green-50 text-green-700"
                          }`}>
                            {eq.stock === 0
                              ? (l === "ru" ? "Нет" : l === "kk" ? "Жоқ" : "N/A")
                              : eq.stock <= 2
                              ? (l === "ru" ? `Осталось ${eq.stock}` : l === "kk" ? `${eq.stock} қалды` : `${eq.stock} left`)
                              : (l === "ru" ? "Есть" : l === "kk" ? "Бар" : "Available")}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-bold text-navy mb-1 line-clamp-2">{n}</h3>
                        {eq.avg_rating && (
                          <div className="text-xs text-slate-500 mb-2">★ {eq.avg_rating} ({eq.review_count})</div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="price-tag text-xl">{formatPrice(eq.price_per_day)}</span>
                            <span className="text-slate-400 text-xs ml-1">/ {l === "ru" ? "день" : l === "kk" ? "күн" : "day"}</span>
                          </div>
                          <span className="text-xs font-semibold text-ice bg-ice-pale px-3 py-1.5 rounded-lg">
                            {l === "ru" ? "Арендовать" : l === "kk" ? "Жалға алу" : "Rent"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ════ КАК ЭТО РАБОТАЕТ ════════════════════════════════════════════ */}
        <section className="py-14 bg-white">
          <div className="container-page">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-navy mb-2">
                {l === "ru" ? "Как это работает" : l === "kk" ? "Бұл қалай жұмыс істейді" : "How It Works"}
              </h2>
              <p className="text-slate-500 text-sm">
                {l === "ru" ? "От выбора до старта за 10 минут" : l === "kk" ? "Таңдаудан бастауға дейін 10 минут" : "From selection to start in 10 minutes"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 bg-ice-pale rounded-2xl flex items-center justify-center text-3xl mb-4">
                    {s.icon}
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-navy text-sm mb-1">{s.ru}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{s.desc_ru}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href={`/${l}/catalog`} className="btn-primary !px-8 !py-3.5 !text-base">
                {l === "ru" ? "Начать аренду" : l === "kk" ? "Жалға алуды бастау" : "Start Renting"}
              </Link>
            </div>
          </div>
        </section>

        {/* ════ FOOTER ══════════════════════════════════════════════════════ */}
        <footer className="bg-navy pt-12 pb-6">
          <div className="container-page">
            <div className="grid md:grid-cols-4 gap-8 pb-10 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Mountain className="w-5 h-5 text-ice" />
                  <span className="font-display font-extrabold text-white">
                    Peak<span className="text-ice">Rent</span>
                  </span>
                </div>
                <p className="text-white/40 text-sm leading-relaxed">
                  Аренда горного снаряжения в Алматы. Kaspi QR, онлайн-бронирование.
                </p>
              </div>
              {[
                {
                  title: l === "ru" ? "Снаряжение" : l === "kk" ? "Жабдықтар" : "Equipment",
                  links: ACTIVITIES.slice(0, 3).map((a) => ({
                    href: `/${l}/catalog?category=${a.slug}`,
                    label: actName(a),
                  })),
                },
                {
                  title: l === "ru" ? "Сервис" : l === "kk" ? "Қызмет" : "Service",
                  links: [
                    { href: `/${l}/ai`,   label: l === "ru" ? "AI-подбор" : l === "kk" ? "AI ұсынысы" : "AI Picks" },
                    { href: `/${l}/auth`, label: l === "ru" ? "Войти"     : l === "kk" ? "Кіру" : "Sign In"   },
                  ],
                },
                {
                  title: l === "ru" ? "Контакты" : l === "kk" ? "Байланыс" : "Contacts",
                  links: [
                    { href: "tel:+77071234567",       label: "+7 (707) 123-45-67"   },
                    { href: "mailto:hello@peakrent.kz", label: "hello@peakrent.kz" },
                  ],
                },
              ].map((col, i) => (
                <div key={i}>
                  <h4 className="text-white font-display font-bold text-xs uppercase tracking-wider mb-3">
                    {col.title}
                  </h4>
                  <ul className="space-y-2">
                    {col.links.map((lnk, j) => (
                      <li key={j}>
                        <Link
                          href={lnk.href}
                          className="text-white/40 hover:text-white text-sm transition-colors"
                        >
                          {lnk.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="pt-5 flex flex-col md:flex-row justify-between gap-2">
              <p className="text-white/25 text-xs">© {new Date().getFullYear()} PeakRent.kz</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
