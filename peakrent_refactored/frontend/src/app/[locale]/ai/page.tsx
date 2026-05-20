"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/navbar";
import { recommendAPI } from "@/lib/api/client";
import { useBookingStore } from "@/lib/stores";
import type { ActivitySlug, Locale, RecommendationItem, RecommendationResponse } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

const ACTIVITIES = [
  { slug: "skiing" as ActivitySlug, icon: "⛷️", ru: "Лыжи", kk: "Шаңғы", en: "Skiing" },
  { slug: "snowboard" as ActivitySlug, icon: "🏂", ru: "Сноуборд", kk: "Сноуборд", en: "Snowboard" },
  { slug: "hiking" as ActivitySlug, icon: "🥾", ru: "Хайкинг", kk: "Хайкинг", en: "Hiking" },
  { slug: "camping" as ActivitySlug, icon: "⛺", ru: "Кемпинг", kk: "Кемпинг", en: "Camping" },
  { slug: "climbing" as ActivitySlug, icon: "🧗", ru: "Альпинизм", kk: "Альпинизм", en: "Climbing" },
  { slug: "trekking" as ActivitySlug, icon: "🗺️", ru: "Треккинг", kk: "Треккинг", en: "Trekking" },
];

const CITIES = ["Алматы", "Астана", "Шымкент", "Бишкек"];

export default function AIPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const addToCart = useBookingStore((state) => state.addItem);
  const cartCount = useBookingStore((state) => state.items.length);

  const [activity, setActivity] = useState<ActivitySlug | "">("");
  const [city, setCity] = useState("Алматы");
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  const t = {
    badge:
      locale === "kk"
        ? "AI көмекші"
        : locale === "en"
        ? "AI advisor"
        : "AI-подбор",
    title:
      locale === "kk"
        ? "Сапарыңызға лайық жабдықты табайық"
        : locale === "en"
        ? "Let’s find the right gear for your trip"
        : "Подберём снаряжение под ваш сценарий",
    subtitle:
      locale === "kk"
        ? "Белсенділік, қала және деңгейіңізге сүйеніп, AI каталогтағы ең лайықты жалға беру позицияларын ұсынады."
        : locale === "en"
        ? "AI uses your activity, city, and skill level to suggest the most suitable rental gear from the catalog."
        : "AI учитывает активность, город и уровень подготовки, чтобы предложить наиболее подходящее снаряжение из каталога.",
    activity: locale === "kk" ? "Белсенділік" : locale === "en" ? "Activity" : "Активность",
    city: locale === "kk" ? "Қала" : locale === "en" ? "City" : "Город",
    level: locale === "kk" ? "Деңгей" : locale === "en" ? "Level" : "Уровень",
    beginner: locale === "kk" ? "Бастаушы" : locale === "en" ? "Beginner" : "Новичок",
    intermediate: locale === "kk" ? "Орташа" : locale === "en" ? "Intermediate" : "Средний",
    advanced: locale === "kk" ? "Жетік" : locale === "en" ? "Advanced" : "Продвинутый",
    loading:
      locale === "kk" ? "Талдап жатырмыз..." : locale === "en" ? "Analyzing..." : "Анализируем...",
    cta:
      locale === "kk"
        ? "AI ұсынысын алу"
        : locale === "en"
        ? "Get AI recommendations"
        : "Запустить AI-подбор",
    selectActivity:
      locale === "kk"
        ? "Алдымен белсенділікті таңдаңыз"
        : locale === "en"
        ? "Select an activity first"
        : "Сначала выберите активность",
    weatherReady:
      locale === "kk"
        ? "Қолжетімділік, маусым және ауа райы да ескеріледі"
        : locale === "en"
        ? "Availability, season, and weather are also considered"
        : "Также учитываются наличие, сезон и погодные условия",
    results:
      locale === "kk" ? "Сізге ұсынамыз" : locale === "en" ? "Recommended for you" : "Рекомендуем для вас",
    positions: locale === "kk" ? "позиция" : locale === "en" ? "items" : "позиций",
    addAll:
      locale === "kk" ? "Барлығын қосу" : locale === "en" ? "Add all" : "Добавить всё",
    rent: locale === "kk" ? "Жалға алу" : locale === "en" ? "Book" : "Арендовать",
    safetyLine:
      locale === "kk"
        ? "Әр ұсыныс қауіпсіздік пен жайлылыққа қатысты қысқа кеңеспен беріледі."
        : locale === "en"
        ? "Every suggestion includes a short safety and comfort hint."
        : "Каждая рекомендация сопровождается короткой подсказкой по безопасности и комфорту.",
    checkout:
      locale === "kk"
        ? "Жалға алуды рәсімдеу"
        : locale === "en"
        ? "Checkout"
        : "Оформить аренду",
    day: locale === "kk" ? "күн" : locale === "en" ? "day" : "день",
    confidence: locale === "kk" ? "Сәйкестік" : locale === "en" ? "Match" : "Совпадение",
    added: locale === "kk" ? "қосылды" : locale === "en" ? "added" : "добавлен",
    loadError:
      locale === "kk"
        ? "Ұсыныстарды жүктеу қатесі"
        : locale === "en"
        ? "Failed to load recommendations"
        : "Ошибка загрузки рекомендаций",
  };

  const getLabel = (item: (typeof ACTIVITIES)[number]) =>
    locale === "kk" ? item.kk : locale === "en" ? item.en : item.ru;

  const itemName = (item: RecommendationItem) =>
    locale === "kk" ? item.name_kk : locale === "en" ? item.name_en : item.name_ru;

  const handleSearch = useCallback(async () => {
    if (!activity) {
      toast.error(t.selectActivity);
      return;
    }

    setLoading(true);
    try {
      const response = await recommendAPI.get({
        activity,
        city,
        level,
        limit: 6,
        locale,
      });
      setResult(response.data);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [activity, city, level, locale, t.loadError, t.selectActivity]);

  return (
    <>
      <Navbar locale={locale} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d9ecff_0%,#f8fafc_40%,#f8fafc_100%)]">
        <section className="relative overflow-hidden border-b border-white/10 bg-navy py-14 sm:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_26%)]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "34px 34px",
            }}
          />

          <div className="container-page relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-ice/30 bg-ice/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-ice-pale">
                <Sparkles className="h-3.5 w-3.5" />
                {t.badge}
              </div>

              <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl">
                {t.title}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                {t.subtitle}
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-[0_30px_90px_rgba(10,22,40,0.22)] backdrop-blur-sm sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                    {t.activity}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ACTIVITIES.map((item) => (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => setActivity(item.slug)}
                        className={cn(
                          "rounded-2xl border px-4 py-4 text-left transition-all",
                          activity === item.slug
                            ? "border-ice bg-ice text-white shadow-[0_15px_35px_rgba(14,165,233,0.28)]"
                            : "border-white/15 bg-white/8 text-white/80 hover:bg-white/12 hover:border-white/28"
                        )}
                      >
                        <div className="text-2xl">{item.icon}</div>
                        <div className="mt-2 text-sm font-semibold">{getLabel(item)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-[1.7rem] border border-white/12 bg-white/8 p-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                        {t.city}
                      </p>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                        <select
                          value={city}
                          onChange={(event) => setCity(event.target.value)}
                          className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-ice [&>option]:bg-white [&>option]:text-navy"
                        >
                          {CITIES.map((option) => (
                            <option key={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                        {t.level}
                      </p>
                      <select
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none transition focus:border-ice [&>option]:bg-white [&>option]:text-navy"
                      >
                        <option value="beginner">{t.beginner}</option>
                        <option value="intermediate">{t.intermediate}</option>
                        <option value="advanced">{t.advanced}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/72">
                    {t.weatherReady}
                  </div>

                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={loading || !activity}
                    className={cn(
                      "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold transition-all",
                      activity && !loading
                        ? "bg-ice text-white shadow-[0_18px_40px_rgba(14,165,233,0.28)] hover:bg-ice-dark"
                        : "cursor-not-allowed bg-white/14 text-white/45"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                        {t.loading}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {t.cta}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {result && (
          <section className="container-page py-10 sm:py-12">
            {result.temperature !== null && (
              <div className="mb-7 inline-flex items-center gap-4 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900 shadow-sm">
                <span className="text-3xl">❄️</span>
                <div>
                  <div className="font-display text-xl font-black text-sky-700">
                    {result.temperature > 0 ? "+" : ""}
                    {result.temperature}°C
                  </div>
                  <p className="text-xs text-sky-900/60">
                    {result.weather} · {result.city}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-black text-navy">{t.results}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {result.items.length} {t.positions}
                </p>
              </div>

              {result.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    result.items.forEach((item) => addToCart(item as any, 1, null, 1));
                    toast.success(`${t.addAll}: ${result.items.length}`);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:border-ice hover:text-ice"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {t.addAll} ({result.items.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_25px_65px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(14,165,233,0.14)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={itemName(item)}
                        fill
                        sizes="(max-width:640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-4xl">🎿</div>
                    )}

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,40,0.04)_0%,rgba(10,22,40,0.6)_100%)]" />

                    <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-navy/82 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-ice" />
                        {t.confidence} {Math.round((item.score ?? 0) * 100)}%
                      </span>
                    </div>

                    <div className="absolute bottom-4 right-4">
                      <Link
                        href={`/${locale}/equipment/${item.slug}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-navy shadow-[0_15px_35px_rgba(15,23,42,0.24)] transition-transform duration-300 hover:translate-x-1"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="line-clamp-2 text-lg font-bold leading-6 text-navy">{itemName(item)}</h3>

                    {item.recommendation_reason && (
                      <div className="mt-4 rounded-r-2xl border-l-2 border-ice bg-ice-pale px-4 py-3">
                        <p className="text-sm leading-6 text-ice-dark">{item.recommendation_reason}</p>
                      </div>
                    )}

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      {t.safetyLine}
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          {t.rent}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-navy">{formatPrice(item.price_per_day)}</span>
                          <span className="text-xs text-slate-400">/ {t.day}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(item as any, 1, null, 1);
                            toast.success(`${itemName(item)} ${t.added}`);
                          }}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ice-pale text-ice transition hover:bg-ice hover:text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>

                        <Link
                          href={`/${locale}/equipment/${item.slug}`}
                          className="inline-flex items-center gap-1 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-navy-light"
                        >
                          {t.rent}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cartCount > 0 && (
              <div className="mt-10 text-center">
                <Link
                  href={`/${locale}/cart`}
                  className="inline-flex items-center gap-2 rounded-full bg-ice px-8 py-4 text-base font-bold text-white shadow-[0_20px_50px_rgba(14,165,233,0.3)] transition hover:bg-ice-dark"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t.checkout} ({cartCount})
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
