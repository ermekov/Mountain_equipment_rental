"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  MapPin,
  Mountain,
  QrCode,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { ActivitySlug, Equipment, Locale } from "@/lib/types";

type LocalizedCopy = {
  ru: string;
  kk: string;
  en: string;
};

type ActivityItem = {
  slug: ActivitySlug;
  icon: string;
  ru: string;
  kk: string;
  en: string;
  blurb: LocalizedCopy;
};

type StepItem = {
  n: string;
  icon: string;
  ru: string;
  kk: string;
  en: string;
  desc: LocalizedCopy;
};

type StatItem = {
  value: number;
  suffix: string;
  label_ru: string;
  label_kk: string;
  label_en: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ReviewItem = {
  name: string;
  rating: number;
  text: LocalizedCopy;
  avatar: string;
};

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1920&auto=format&fit=crop&q=80";

function createSeededRandom(seed: number) {
  let current = seed;
  return () => {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

const snowRandom = createSeededRandom(42);
const SNOW_PARTICLES = Array.from({ length: 26 }, (_, index) => ({
  id: index,
  left: `${snowRandom() * 100}%`,
  size: 4 + snowRandom() * 8,
  duration: 8 + snowRandom() * 8,
  delay: snowRandom() * 4,
  drift: -24 + snowRandom() * 48,
  opacity: 0.2 + snowRandom() * 0.45,
}));

const TICKER_ITEMS = [
  "Шымбұлақ",
  "Ой-Қарағай",
  "Ак-Бұлақ",
  "Kaspi QR",
  "AI-подбор",
  "PeakRent.kz",
];

const ACTIVITIES: ActivityItem[] = [
  {
    slug: "skiing",
    icon: "⛷️",
    ru: "Горные лыжи",
    kk: "Тау шаңғысы",
    en: "Skiing",
    blurb: {
      ru: "Комплекты для трасс Шымбулака и скоростных спусков.",
      kk: "Шымбұлақ трассалары мен жылдам түсуге арналған жинақтар.",
      en: "Slope-ready sets for Shymbulak and fast alpine descents.",
    },
  },
  {
    slug: "snowboard",
    icon: "🏂",
    ru: "Сноуборд",
    kk: "Сноуборд",
    en: "Snowboard",
    blurb: {
      ru: "Доски, крепления и защита для парка и фрирайда.",
      kk: "Парк пен фрирайдқа арналған тақта, бекіткіш және қорғаныс.",
      en: "Boards, bindings and protection for park and freeride days.",
    },
  },
  {
    slug: "hiking",
    icon: "🥾",
    ru: "Хайкинг",
    kk: "Хайкинг",
    en: "Hiking",
    blurb: {
      ru: "Трекинговая обувь и лёгкое снаряжение для однодневных маршрутов.",
      kk: "Бір күндік бағыттарға арналған треккинг аяқ киімі мен жеңіл жабдық.",
      en: "Trail boots and lightweight gear for one-day mountain routes.",
    },
  },
  {
    slug: "camping",
    icon: "⛺",
    ru: "Кемпинг",
    kk: "Кемпинг",
    en: "Camping",
    blurb: {
      ru: "Палатки, спальники и тёплые наборы для ночёвки в горах.",
      kk: "Тауда түнеуге арналған шатыр, ұйықтайтын қап және жылы жиынтықтар.",
      en: "Tents, sleeping bags and warm kits for overnight mountain stays.",
    },
  },
  {
    slug: "climbing",
    icon: "🧗",
    ru: "Альпинизм",
    kk: "Альпинизм",
    en: "Climbing",
    blurb: {
      ru: "Каски, системы и железо для скальных и ледовых маршрутов.",
      kk: "Жартас және мұз бағыттарына арналған каска, жүйе және темір керек-жарақ.",
      en: "Helmets, harnesses and technical hardware for climbing routes.",
    },
  },
  {
    slug: "trekking",
    icon: "🗺️",
    ru: "Треккинг",
    kk: "Треккинг",
    en: "Trekking",
    blurb: {
      ru: "Палки, рюкзаки и защита от погоды для длинных переходов.",
      kk: "Ұзақ бағыттарға арналған таяқ, рюкзак және ауа райынан қорғаныс.",
      en: "Poles, packs and weather protection for long scenic treks.",
    },
  },
];

const HOW_IT_WORKS: StepItem[] = [
  {
    n: "01",
    icon: "🔍",
    ru: "Выберите снаряжение",
    kk: "Жабдықты таңдаңыз",
    en: "Choose your gear",
    desc: {
      ru: "Подберите комплект через каталог или AI по погоде, маршруту и уровню подготовки.",
      kk: "Каталог немесе AI арқылы ауа райы, бағыт және деңгей бойынша жиынтық таңдаңыз.",
      en: "Pick a kit through the catalog or AI based on weather, route and skill level.",
    },
  },
  {
    n: "02",
    icon: "📅",
    ru: "Забронируйте онлайн",
    kk: "Онлайн брондаңыз",
    en: "Book online",
    desc: {
      ru: "Укажите даты, размер и формат получения. Система сразу проверит доступность.",
      kk: "Күндерді, өлшемді және алу тәсілін көрсетіңіз. Жүйе қолжетімділікті бірден тексереді.",
      en: "Select dates, size and pickup mode. The system instantly checks availability.",
    },
  },
  {
    n: "03",
    icon: "📱",
    ru: "Оплатите Kaspi QR",
    kk: "Kaspi QR арқылы төлеңіз",
    en: "Pay with Kaspi QR",
    desc: {
      ru: "Сканируйте QR, подтверждайте оплату и получайте статус брони без звонков.",
      kk: "QR-ды сканерлеп, төлемді растаңыз және бронь статусын қоңыраусыз алыңыз.",
      en: "Scan the QR, confirm payment and get your booking status without extra calls.",
    },
  },
  {
    n: "04",
    icon: "🎿",
    ru: "Заберите и катайтесь",
    kk: "Алып кетіп, жолға шығыңыз",
    en: "Pick up and ride",
    desc: {
      ru: "Приезжайте в точку выдачи, получите снаряжение и отправляйтесь в горы.",
      kk: "Алу нүктесіне келіп, жабдықты алып, тауға аттаныңыз.",
      en: "Arrive at the pickup point, collect your kit and head straight to the mountains.",
    },
  },
];

const STATS: StatItem[] = [
  {
    value: 1500,
    suffix: "+",
    label_ru: "довольных клиентов",
    label_kk: "разы клиент",
    label_en: "happy clients",
    icon: Users,
  },
  {
    value: 200,
    suffix: "+",
    label_ru: "единиц снаряжения",
    label_kk: "жабдық бірлігі",
    label_en: "gear items",
    icon: Mountain,
  },
  {
    value: 4.9,
    suffix: "★",
    label_ru: "средний рейтинг",
    label_kk: "орташа рейтинг",
    label_en: "average rating",
    icon: Star,
  },
  {
    value: 24,
    suffix: "/7",
    label_ru: "онлайн-бронирование",
    label_kk: "онлайн брондау",
    label_en: "online booking",
    icon: Clock3,
  },
];

const REVIEWS: ReviewItem[] = [
  {
    name: "Айдос",
    rating: 5,
    avatar: "А",
    text: {
      ru: "Лыжи — огонь! Заказал за 10 минут, QR пришёл сразу. Буду ещё!",
      kk: "Шаңғы керемет! 10 минутта тапсырыс бердім, QR бірден келді. Тағы аламын!",
      en: "The skis were excellent. I booked in 10 minutes and got the QR instantly.",
    },
  },
  {
    name: "Ксения",
    rating: 5,
    avatar: "К",
    text: {
      ru: "Шлем подошёл идеально, всё чистое и в отличном состоянии.",
      kk: "Шлем дәл келді, бәрі таза және өте жақсы күйде болды.",
      en: "The helmet fit perfectly, everything was clean and in great condition.",
    },
  },
  {
    name: "Марат",
    rating: 5,
    avatar: "М",
    text: {
      ru: "AI-подбор реально советует по погоде. Взял правильное снаряжение!",
      kk: "AI расымен ауа райына қарай кеңес береді. Дұрыс жабдық алдым!",
      en: "The AI picks really matched the weather. I ended up with the right gear.",
    },
  },
];

const HERO_LINES: Record<
  Locale,
  Array<Array<{ text: string; accent?: boolean }>>
> = {
  ru: [
    [{ text: "Премиальная" }, { text: "аренда" }],
    [{ text: "горного" }, { text: "снаряжения", accent: true }],
  ],
  kk: [
    [{ text: "Премиум" }, { text: "жалға" }],
    [{ text: "тау" }, { text: "жабдықтары", accent: true }],
  ],
  en: [
    [{ text: "Premium" }, { text: "rental" }],
    [{ text: "for" }, { text: "mountain", accent: true }],
    [{ text: "gear" }],
  ],
};

const HERO_SUBTITLE: Record<Locale, string> = {
  ru: "Шымбулак, Ой-Қарағай и горные маршруты Алматы — бронируйте лыжи, сноуборды и hiking-gear онлайн за пару минут.",
  kk: "Шымбұлақ, Ой-Қарағай және Алматы тауларына арналған шаңғы, сноуборд пен hiking-жабдықты бірнеше минутта онлайн брондаңыз.",
  en: "For Shymbulak, Oi-Qaragai and Almaty mountain routes — book skis, snowboards and hiking gear online in minutes.",
};

const SECTION_LABELS = {
  heroEyebrow: {
    ru: "Платформа аренды для гор",
    kk: "Тауға арналған жалға беру платформасы",
    en: "Mountain rental platform",
  },
  heroPrimaryCta: {
    ru: "Смотреть каталог",
    kk: "Каталогты қарау",
    en: "Browse catalog",
  },
  heroSecondaryCta: {
    ru: "AI-подбор",
    kk: "AI ұсынысы",
    en: "AI picks",
  },
  heroTrustInsurance: {
    ru: "Страховка включена",
    kk: "Сақтандыру кіреді",
    en: "Insurance included",
  },
  heroTrustPickup: {
    ru: "Выдача за 5 минут",
    kk: "5 минутта беру",
    en: "5-minute pickup",
  },
  heroTrustLocations: {
    ru: "2 точки выдачи",
    kk: "2 алу пункті",
    en: "2 pickup points",
  },
  heroTrustAi: {
    ru: "С AI-рекомендациями",
    kk: "AI ұсыныстарымен",
    en: "AI-powered guidance",
  },
  tickerLabel: {
    ru: "Популярные локации и сервисы",
    kk: "Танымал локациялар мен сервистер",
    en: "Popular locations and services",
  },
  activitiesTitle: {
    ru: "Сценарии активного отдыха",
    kk: "Белсенді демалыс сценарийлері",
    en: "Outdoor activity scenarios",
  },
  activitiesText: {
    ru: "Подбирайте комплекты по формату поездки — от трассы до многодневного треккинга.",
    kk: "Сапар форматына қарай жиынтық таңдаңыз — трассадан көпкүндік треккингке дейін.",
    en: "Choose gear sets for every trip style, from ski slopes to multi-day treks.",
  },
  aiTitle: {
    ru: "AI подскажет, что взять именно сегодня",
    kk: "AI бүгін не алу керегін ұсынады",
    en: "AI suggests what to rent for today",
  },
  aiText: {
    ru: "Сервис учитывает активность, сезон, доступность и условия в Алматы, чтобы собрать комплект без лишних позиций.",
    kk: "Сервис Алматыдағы белсенділік, маусым, қолжетімділік пен жағдайды ескеріп, артық затсыз жиынтық ұсынады.",
    en: "The service considers activity, season, availability and Almaty conditions to build the right kit.",
  },
  aiButton: {
    ru: "Запустить AI-подбор",
    kk: "AI-таңдауды бастау",
    en: "Launch AI picker",
  },
  popularTitle: {
    ru: "Популярное снаряжение",
    kk: "Танымал жабдықтар",
    en: "Popular equipment",
  },
  popularText: {
    ru: "То, что чаще всего бронируют перед выездом в горы.",
    kk: "Таудай сапар алдында жиі брондалатын жабдықтар.",
    en: "The items most often booked before heading to the mountains.",
  },
  popularViewAll: {
    ru: "Все позиции",
    kk: "Барлығын көру",
    en: "View all",
  },
  popularRent: {
    ru: "Арендовать",
    kk: "Жалға алу",
    en: "Rent now",
  },
  popularBadge: {
    ru: "Популярное",
    kk: "Танымал",
    en: "Popular",
  },
  popularRemaining: {
    ru: "Осталось",
    kk: "Қалды",
    en: "Remaining",
  },
  howTitle: {
    ru: "Как это работает",
    kk: "Бұл қалай жұмыс істейді",
    en: "How it works",
  },
  howText: {
    ru: "Путь от выбора снаряжения до выхода на склон без звонков и долгих подтверждений.",
    kk: "Жабдық таңдаудан беткейге шығуға дейінгі жол — қоңыраусыз және ұзақ растаусыз.",
    en: "From gear selection to the slope without long calls or manual confirmations.",
  },
  reviewTitle: {
    ru: "Нам доверяют поездки в горы",
    kk: "Таудағы сапарларын бізге сеніп тапсырады",
    en: "Trusted for mountain trips",
  },
  reviewText: {
    ru: "Короткие отзывы от тех, кто уже бронировал PeakRent перед выездом.",
    kk: "PeakRent арқылы брондаған клиенттердің қысқа пікірлері.",
    en: "Short notes from people who already booked with PeakRent.",
  },
  ctaTitle: {
    ru: "Соберите комплект до выезда в горы",
    kk: "Таудай сапарға дейін жиынтықты дайындап қойыңыз",
    en: "Build your kit before the mountain trip",
  },
  ctaText: {
    ru: "Откройте каталог или доверьте подбор AI — и заберите всё готовое в удобной точке выдачи.",
    kk: "Каталогты ашыңыз немесе AI-ға сеніңіз — дайын жиынтықты ыңғайлы алу нүктесінен алыңыз.",
    en: "Open the catalog or let the AI help, then pick up a ready-to-go kit from a convenient location.",
  },
  ctaButton: {
    ru: "Начать бронирование",
    kk: "Брондауды бастау",
    en: "Start booking",
  },
  footerText: {
    ru: "Аренда горного снаряжения в Алматы с AI-подбором, Kaspi QR и быстрой выдачей.",
    kk: "Алматыда AI-таңдау, Kaspi QR және жылдам берумен тау жабдықтарын жалға беру.",
    en: "Mountain gear rental in Almaty with AI guidance, Kaspi QR and fast pickup.",
  },
  footerEquipment: {
    ru: "Снаряжение",
    kk: "Жабдықтар",
    en: "Equipment",
  },
  footerService: {
    ru: "Сервис",
    kk: "Сервис",
    en: "Service",
  },
  footerContacts: {
    ru: "Контакты",
    kk: "Байланыс",
    en: "Contacts",
  },
  footerAi: {
    ru: "AI-подбор",
    kk: "AI ұсынысы",
    en: "AI picks",
  },
  footerAuth: {
    ru: "Войти",
    kk: "Кіру",
    en: "Sign in",
  },
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 40, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

function copy(locale: Locale, value: LocalizedCopy) {
  return value[locale] ?? value.ru;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function equipmentName(item: Equipment, locale: Locale) {
  if (locale === "kk") return item.name_kk || item.name_ru;
  if (locale === "en") return item.name_en || item.name_ru;
  return item.name_ru;
}

function categoryName(item: Equipment, locale: Locale) {
  if (!item.category) return "";
  if (locale === "kk") return item.category.name_kk || item.category.name_ru;
  if (locale === "en") return item.category.name_en || item.category.name_ru;
  return item.category.name_ru;
}

function SnowParticles() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {SNOW_PARTICLES.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute top-0 rounded-full bg-white"
          style={{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            opacity: particle.opacity,
          }}
          initial={{ y: "-10%", x: 0 }}
          animate={{ y: "110vh", x: [0, particle.drift, 0] }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
  className = "",
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const duration = 1400;
    const start = performance.now();

    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(value * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isInView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString("ru-RU", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function TypewriterText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? text : "");

  useEffect(() => {
    if (reduceMotion) {
      setValue(text);
      return;
    }

    let index = 0;
    setValue("");
    const timer = window.setInterval(() => {
      index += 1;
      setValue(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, 28);

    return () => window.clearInterval(timer);
  }, [reduceMotion, text]);

  return (
    <span className={className}>
      {value}
      {!reduceMotion && value.length < text.length && (
        <span className="ml-1 inline-block h-[1em] w-px animate-pulse bg-ice align-middle" />
      )}
    </span>
  );
}

function HeroSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 800], [0, reduceMotion ? 0 : 100]);
  const overlayY = useTransform(scrollY, [0, 800], [0, reduceMotion ? 0 : 60]);

  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-navy">
      <motion.div className="absolute inset-0" style={{ y: imageY }}>
        <Image
          src={HERO_IMAGE}
          alt="Mountain landscape in Almaty"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,40,0.48)_0%,rgba(10,22,40,0.74)_32%,rgba(10,22,40,0.92)_100%)]"
        style={{ y: overlayY }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.18),transparent_28%),linear-gradient(120deg,rgba(10,22,40,0.98),rgba(20,34,56,0.76)_45%,rgba(10,22,40,0.92))]" />
      <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-navy via-navy/85 to-transparent" />
      <SnowParticles />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-12 lg:pt-32">
        <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-3xl"
          >
            <motion.div
              variants={fadeUpVariants}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70 backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5 text-ice" />
              {copy(locale, SECTION_LABELS.heroEyebrow)}
            </motion.div>

            <div className="space-y-3">
              {HERO_LINES[locale].map((line, lineIndex) => (
                <motion.div
                  key={`${locale}-line-${lineIndex}`}
                  className="flex flex-wrap items-end gap-x-3 gap-y-1 text-balance text-[clamp(2.6rem,7vw,6.4rem)] font-black leading-[0.92] tracking-[-0.05em] text-white font-display"
                  variants={containerVariants}
                >
                  {line.map((word, wordIndex) => (
                    <motion.span
                      key={`${word.text}-${wordIndex}`}
                      variants={wordVariants}
                      className={
                        word.accent
                          ? "bg-gradient-to-r from-ice-pale via-sky-300 to-ice bg-clip-text text-transparent"
                          : ""
                      }
                    >
                      {word.text}
                    </motion.span>
                  ))}
                </motion.div>
              ))}
            </div>

            <motion.p
              variants={fadeUpVariants}
              transition={{ delay: 0.6, duration: 0.7 }}
              className="mt-7 max-w-2xl text-base leading-8 text-white/72 sm:text-lg"
            >
              {HERO_SUBTITLE[locale]}
            </motion.p>

            <motion.div
              variants={fadeUpVariants}
              transition={{ delay: 1, duration: 0.7 }}
              className="mt-10 flex flex-col gap-3 sm:flex-row"
            >
              <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/${locale}/catalog`}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-ice px-6 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(14,165,233,0.35)] transition-all duration-300 hover:bg-ice-dark hover:shadow-[0_24px_60px_rgba(14,165,233,0.45)]"
                >
                  {copy(locale, SECTION_LABELS.heroPrimaryCta)}
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.div whileHover={reduceMotion ? undefined : { scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/${locale}/ai`}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-6 py-4 text-sm font-semibold text-white backdrop-blur transition-all duration-300 hover:border-ice/50 hover:bg-white/12"
                >
                  <BrainCircuit className="h-4 w-4 text-ice" />
                  {copy(locale, SECTION_LABELS.heroSecondaryCta)}
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {STATS.map((stat, index) => {
              const Icon = stat.icon;
              const decimals = Number.isInteger(stat.value) ? 0 : 1;
              const label =
                locale === "kk" ? stat.label_kk : locale === "en" ? stat.label_en : stat.label_ru;
              return (
                <div
                  key={stat.label_ru}
                  className={`rounded-3xl border border-white/12 bg-white/10 p-5 backdrop-blur-xl ${
                    index === 0 ? "sm:col-span-2" : ""
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex rounded-2xl bg-white/10 p-2 text-ice">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                      PeakRent
                    </span>
                  </div>
                  <div className="text-3xl font-black tracking-[-0.04em] text-white font-display sm:text-4xl">
                    <AnimatedCounter
                      value={stat.value}
                      suffix={stat.suffix}
                      decimals={decimals}
                    />
                  </div>
                  <p className="mt-2 text-sm text-white/65">{label}</p>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.8 }}
          className="space-y-4"
        >
          <div className="grid gap-3 border-t border-white/15 pt-6 sm:grid-cols-3">
            {[
              { icon: Shield, text: copy(locale, SECTION_LABELS.heroTrustInsurance) },
              { icon: Clock3, text: copy(locale, SECTION_LABELS.heroTrustPickup) },
              { icon: MapPin, text: copy(locale, SECTION_LABELS.heroTrustLocations) },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70 backdrop-blur"
                >
                  <span className="inline-flex rounded-full bg-ice/15 p-2 text-ice">
                    <Icon className="h-4 w-4" />
                  </span>
                  {item.text}
                </div>
              );
            })}
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-ice/30 bg-ice/12 px-4 py-2">
            <Sparkles className="h-4 w-4 text-ice" />
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-ice">
              {copy(locale, SECTION_LABELS.heroTrustAi)}
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35 }}
          className="flex justify-center"
        >
          <motion.a
            href="#activities"
            animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex flex-col items-center gap-2 text-white/55 transition-colors hover:text-white"
          >
            <span className="text-[11px] uppercase tracking-[0.3em]">Scroll</span>
            <ArrowDown className="h-4 w-4" />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

function TickerSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <section className="overflow-hidden bg-ice py-3 text-navy">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.28em] text-navy/65">
          {copy(locale, SECTION_LABELS.tickerLabel)}
        </span>
        <div className="relative flex-1 overflow-hidden">
          <motion.div
            className="flex min-w-max gap-8 text-sm font-semibold"
            animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={reduceMotion ? undefined : { duration: 20, repeat: Infinity, ease: "linear" }}
          >
            {items.map((item, index) => (
              <span key={`${item}-${index}`} className="inline-flex items-center gap-8 whitespace-nowrap">
                <span>{item}</span>
                <span className="text-navy/45">•</span>
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function TiltActivityCard({
  activity,
  locale,
  active,
  onActivate,
}: {
  activity: ActivityItem;
  locale: Locale;
  active: boolean;
  onActivate: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const localizedTitle =
    locale === "kk" ? activity.kk : locale === "en" ? activity.en : activity.ru;

  const handleMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const rotateY = ((offsetX / rect.width) - 0.5) * 12;
    const rotateX = (0.5 - offsetY / rect.height) * 12;
    setTilt({ x: rotateX, y: rotateY });
  };

  return (
    <motion.div variants={cardVariants}>
      <Link
        href={`/${locale}/catalog?category=${activity.slug}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        onMouseEnter={onActivate}
        onFocus={onActivate}
        className={`group block rounded-[28px] border p-5 transition-all duration-300 ${
          active
            ? "border-ice bg-ice-pale shadow-[0_24px_80px_rgba(14,165,233,0.14)]"
            : "border-slate-200 bg-white hover:border-ice/40 hover:shadow-[0_24px_70px_rgba(10,22,40,0.09)]"
        }`}
        style={{
          transform: reduceMotion
            ? undefined
            : `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <motion.span
            animate={
              active && !reduceMotion
                ? { y: [0, -6, 0], rotate: [0, -4, 4, 0] }
                : { y: 0, rotate: 0 }
            }
            transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
            className="text-4xl transition-transform duration-300 group-hover:scale-110"
          >
            {activity.icon}
          </motion.span>
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
              active ? "bg-white text-ice-dark" : "bg-slate-100 text-slate-500"
            }`}
          >
            PeakRent
          </span>
        </div>
        <h3 className="mt-5 text-lg font-black tracking-[-0.03em] text-navy font-display">
          {localizedTitle}
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{copy(locale, activity.blurb)}</p>
      </Link>
    </motion.div>
  );
}

function ActivitiesSection({ locale }: { locale: Locale }) {
  const [activeSlug, setActiveSlug] = useState<ActivitySlug>("skiing");

  return (
    <section id="activities" className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUpVariants}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ice-dark">
            PeakRent
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-navy font-display sm:text-5xl">
            {copy(locale, SECTION_LABELS.activitiesTitle)}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {copy(locale, SECTION_LABELS.activitiesText)}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {ACTIVITIES.map((activity) => (
            <TiltActivityCard
              key={activity.slug}
              activity={activity}
              locale={locale}
              active={activeSlug === activity.slug}
              onActivate={() => setActiveSlug(activity.slug)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AiBannerSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-navy py-20 sm:py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.2)_1px,transparent_0)] [background-size:22px_22px]" />
      <motion.div
        className="absolute -left-12 top-10 h-24 w-24 rounded-full border border-ice/25 bg-ice/10 blur-[2px]"
        animate={reduceMotion ? undefined : { y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-10 top-16 text-4xl text-ice/40"
        animate={reduceMotion ? undefined : { y: [0, -12, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        ❄
      </motion.div>
      <motion.div
        className="absolute bottom-10 right-[18%] text-5xl text-white/10"
        animate={reduceMotion ? undefined : { y: [0, -14, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        ⛰
      </motion.div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={containerVariants}
        >
          <motion.div
            variants={fadeUpVariants}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-ice/30 bg-ice/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-ice"
          >
            <BrainCircuit className="h-3.5 w-3.5" />
            AI Assistant
          </motion.div>
          <motion.h2
            variants={fadeUpVariants}
            className="max-w-2xl text-3xl font-black tracking-[-0.04em] text-white font-display sm:text-5xl"
          >
            <TypewriterText text={copy(locale, SECTION_LABELS.aiTitle)} />
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mt-5 max-w-2xl text-base leading-8 text-white/68"
          >
            {copy(locale, SECTION_LABELS.aiText)}
          </motion.p>

          <motion.div variants={fadeUpVariants} className="mt-8">
            <div className="relative isolate inline-flex overflow-hidden rounded-2xl p-[1px]">
              <motion.div
                className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.18),rgba(224,242,254,0.95),rgba(14,165,233,0.18))]"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              <Link
                href={`/${locale}/ai`}
                className="relative inline-flex items-center gap-2 rounded-2xl bg-navy px-6 py-4 text-sm font-semibold text-white"
              >
                <Sparkles className="h-4 w-4 text-ice" />
                {copy(locale, SECTION_LABELS.aiButton)}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={containerVariants}
          className="grid gap-3 sm:grid-cols-2"
        >
          {ACTIVITIES.map((activity) => (
            <motion.div key={activity.slug} variants={cardVariants}>
              <Link
                href={`/${locale}/ai?activity=${activity.slug}`}
                className="group flex items-center gap-4 rounded-3xl border border-white/12 bg-white/6 px-5 py-4 text-white/80 transition-all duration-300 hover:border-ice/45 hover:bg-white/10 hover:shadow-[0_20px_40px_rgba(14,165,233,0.14)]"
              >
                <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                  {activity.icon}
                </span>
                <div>
                  <div className="font-display text-lg font-bold text-white">
                    {locale === "kk" ? activity.kk : locale === "en" ? activity.en : activity.ru}
                  </div>
                  <div className="text-xs text-white/50">{copy(locale, activity.blurb)}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function ProductCard({ item, locale }: { item: Equipment; locale: Locale }) {
  const name = equipmentName(item, locale);
  const category = categoryName(item, locale);

  return (
    <motion.div variants={cardVariants} className="snap-start">
      <Link
        href={`/${locale}/equipment/${item.slug}`}
        className="group block overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(10,22,40,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(14,165,233,0.2)]"
      >
        <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={name}
              fill
              sizes="(max-width: 1024px) 80vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
              🎿
            </div>
          )}

          <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-semibold text-navy backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-ice animate-pulse" />
            {copy(locale, SECTION_LABELS.popularBadge)}
          </div>

          <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-navy/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {copy(locale, SECTION_LABELS.popularRemaining)} {Math.max(1, Math.min(item.stock, 2))}{" "}
            {locale === "en" ? "pcs." : "шт."}
          </div>

          <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-navy/80 via-navy/0 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy shadow-lg">
              {copy(locale, SECTION_LABELS.popularRent)}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-ice-pale px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-ice-dark">
              {item.category?.icon ?? "🏔"} {category}
            </div>
            <h3 className="text-xl font-black tracking-[-0.03em] text-navy font-display">{name}</h3>
            <p className="line-clamp-2 text-sm leading-7 text-slate-600">
              {locale === "kk"
                ? item.description_kk || item.description_ru
                : locale === "en"
                  ? item.description_en || item.description_ru
                  : item.description_ru}
            </p>
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                {locale === "kk" ? "Күніне" : locale === "en" ? "Per day" : "За день"}
              </div>
              <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-navy font-display">
                <AnimatedCounter value={item.price_per_day} suffix=" ₸" />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {item.avg_rating ?? 4.9}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function PopularSection({
  locale,
  featured,
}: {
  locale: Locale;
  featured: Equipment[];
}) {
  if (!featured.length) return null;

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUpVariants}
          className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ice-dark">
              PeakRent
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-navy font-display sm:text-5xl">
              {copy(locale, SECTION_LABELS.popularTitle)}
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              {copy(locale, SECTION_LABELS.popularText)}
            </p>
          </div>
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-navy transition-colors hover:text-ice-dark"
          >
            {copy(locale, SECTION_LABELS.popularViewAll)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
          variants={containerVariants}
          className="flex snap-x gap-5 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible"
        >
          {featured.map((item) => (
            <div key={item.id} className="min-w-[82vw] sm:min-w-[56vw] lg:min-w-0">
              <ProductCard item={item} locale={locale} />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-surface py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUpVariants}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ice-dark">
            PeakRent flow
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-navy font-display sm:text-5xl">
            {copy(locale, SECTION_LABELS.howTitle)}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {copy(locale, SECTION_LABELS.howText)}
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 top-0 hidden h-full lg:left-1/2 lg:block lg:-translate-x-1/2">
            <svg width="2" height="100%" viewBox="0 0 2 600" className="h-full">
              <motion.path
                d="M1 0 L1 600"
                stroke="#0EA5E9"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0, opacity: 0.25 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            </svg>
          </div>

          <div className="space-y-6">
            {HOW_IT_WORKS.map((step, index) => {
              const isLeft = index % 2 === 0;
              const title = locale === "kk" ? step.kk : locale === "en" ? step.en : step.ru;
              const card = (
                <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(10,22,40,0.06)]">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-ice-dark">
                    Step {step.n}
                  </span>
                  <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-navy font-display">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{copy(locale, step.desc)}</p>
                </div>
              );

              return (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 24 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, amount: 0.28 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="grid gap-4 lg:grid-cols-[1fr_84px_1fr] lg:items-center"
                >
                  <div className="lg:hidden">{card}</div>

                  <div className="hidden lg:block">{isLeft ? card : <div />}</div>

                  <div className="relative flex justify-start lg:justify-center">
                    <motion.div
                      initial={{ rotate: 0, scale: 0.7, opacity: 0 }}
                      whileInView={{ rotate: reduceMotion ? 0 : 360, scale: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-2xl shadow-[0_18px_45px_rgba(10,22,40,0.22)]"
                    >
                      <span>{step.icon}</span>
                    </motion.div>
                  </div>

                  <div className="hidden lg:block">{isLeft ? <div /> : card}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUpVariants}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-ice-dark">
            Community
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-navy font-display sm:text-5xl">
            {copy(locale, SECTION_LABELS.reviewTitle)}
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            {copy(locale, SECTION_LABELS.reviewText)}
          </p>
        </motion.div>

        <div className="mt-12 rounded-[34px] border border-slate-200 bg-surface p-6 shadow-[0_18px_60px_rgba(10,22,40,0.07)] sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ice text-xl font-black text-white">
                {REVIEWS[current].avatar}
              </div>
              <div className="mt-5 flex justify-center gap-1 text-amber-400">
                {Array.from({ length: REVIEWS[current].rating }).map((_, index) => (
                  <Star key={index} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 tracking-[-0.02em] text-navy font-display sm:text-2xl">
                “{copy(locale, REVIEWS[current].text)}”
              </p>
              <div className="mt-6 text-sm font-semibold text-slate-500">{REVIEWS[current].name}</div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-center gap-2">
            {REVIEWS.map((review, index) => (
              <button
                key={review.name}
                type="button"
                onClick={() => setCurrent(index)}
                className={`h-2.5 rounded-full transition-all ${
                  current === index ? "w-8 bg-ice" : "w-2.5 bg-slate-300"
                }`}
                aria-label={`Review ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaSection({ locale }: { locale: Locale }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-navy py-20 sm:py-24">
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(120deg,#0A1628_0%,#142238_35%,#1E3A5F_65%,#0A1628_100%)]"
        animate={reduceMotion ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        style={{ backgroundSize: "220% 220%" }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={containerVariants}
        >
          <motion.h2
            variants={fadeUpVariants}
            className="text-3xl font-black tracking-[-0.04em] text-white font-display sm:text-5xl"
          >
            {copy(locale, SECTION_LABELS.ctaTitle)}
          </motion.h2>
          <motion.p
            variants={fadeUpVariants}
            className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/68"
          >
            {copy(locale, SECTION_LABELS.ctaText)}
          </motion.p>
          <motion.div variants={fadeUpVariants} className="mt-10 flex justify-center">
            <Link
              href={`/${locale}/catalog`}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-ice px-7 py-4 text-sm font-semibold text-white shadow-[0_16px_50px_rgba(14,165,233,0.35)] transition-transform duration-300 hover:scale-[1.03]"
            >
              <motion.span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                animate={reduceMotion ? undefined : { x: ["-120%", "360%"] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
              />
              <span className="relative">{copy(locale, SECTION_LABELS.ctaButton)}</span>
              <ArrowRight className="relative h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FooterSection({ locale }: { locale: Locale }) {
  const footerLinks = [
    {
      title: copy(locale, SECTION_LABELS.footerEquipment),
      links: ACTIVITIES.slice(0, 3).map((activity) => ({
        href: `/${locale}/catalog?category=${activity.slug}`,
        label: locale === "kk" ? activity.kk : locale === "en" ? activity.en : activity.ru,
      })),
    },
    {
      title: copy(locale, SECTION_LABELS.footerService),
      links: [
        { href: `/${locale}/ai`, label: copy(locale, SECTION_LABELS.footerAi) },
        { href: `/${locale}/auth`, label: copy(locale, SECTION_LABELS.footerAuth) },
      ],
    },
    {
      title: copy(locale, SECTION_LABELS.footerContacts),
      links: [
        { href: "tel:+77071234567", label: "+7 (707) 123-45-67" },
        { href: "mailto:hello@peakrent.kz", label: "hello@peakrent.kz" },
      ],
    },
  ];

  return (
    <motion.footer
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7 }}
      className="bg-[#081220] py-14"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-2xl bg-ice/15 p-2 text-ice">
                <Mountain className="h-5 w-5" />
              </span>
              <span className="text-xl font-black tracking-[-0.04em] text-white font-display">
                PeakRent.kz
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-white/55">
              {copy(locale, SECTION_LABELS.footerText)}
            </p>
          </div>

          {footerLinks.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="group inline-flex flex-col text-sm text-white/70">
                      <span>{link.label}</span>
                      <span className="mt-1 h-px origin-left scale-x-0 bg-ice transition-transform duration-300 group-hover:scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} PeakRent.kz</span>
          <span>Shymbulak · Oi-Qaragai · Almaty Mountains</span>
        </div>
      </div>
    </motion.footer>
  );
}

export default function HomePageClient({
  locale,
  featured,
}: {
  locale: Locale;
  featured: Equipment[];
}) {
  return (
    <LazyMotion features={domAnimation}>
      <main className="bg-white">
        <HeroSection locale={locale} />
        <TickerSection locale={locale} />
        <ActivitiesSection locale={locale} />
        <AiBannerSection locale={locale} />
        <PopularSection locale={locale} featured={featured} />
        <HowItWorksSection locale={locale} />
        <ReviewsSection locale={locale} />
        <CtaSection locale={locale} />
        <FooterSection locale={locale} />
      </main>
    </LazyMotion>
  );
}
