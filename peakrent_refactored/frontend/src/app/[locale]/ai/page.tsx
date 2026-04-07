"use client";
import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ChevronRight, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils";
import { useBookingStore } from "@/lib/stores";
import { recommendAPI } from "@/lib/api/client";
import { Navbar } from "@/components/layout/navbar";
import type { Locale, ActivitySlug, RecommendationResponse, RecommendationItem } from "@/lib/types";

const ACTS = [
  { slug: "skiing"    as ActivitySlug, icon: "⛷️", ru: "Лыжи",      kk: "Шаңғы",    en: "Skiing"    },
  { slug: "snowboard" as ActivitySlug, icon: "🏂", ru: "Сноуборд",   kk: "Сноуборд", en: "Snowboard" },
  { slug: "hiking"    as ActivitySlug, icon: "🥾", ru: "Хайкинг",    kk: "Хайкинг",  en: "Hiking"    },
  { slug: "camping"   as ActivitySlug, icon: "⛺", ru: "Кемпинг",    kk: "Кемпинг",  en: "Camping"   },
  { slug: "climbing"  as ActivitySlug, icon: "🧗", ru: "Альпинизм",  kk: "Альпинизм",en: "Climbing"  },
  { slug: "trekking"  as ActivitySlug, icon: "🗺️", ru: "Треккинг",   kk: "Треккинг", en: "Trekking"  },
];

export default function AIPage({ params }: { params: { locale: string } }) {
  const l = params.locale as Locale;
  const [activity, setActivity] = useState<ActivitySlug | "">("");
  const [city,     setCity]     = useState("Алматы");
  const [level,    setLevel]    = useState("beginner");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<RecommendationResponse | null>(null);

  const addToCart  = useBookingStore((s) => s.addItem);
  const cartCount  = useBookingStore((s) => s.items.length);

  const getLabel = (a: typeof ACTS[0]) => l === "kk" ? a.kk : l === "en" ? a.en : a.ru;

  const handleSearch = useCallback(async () => {
    if (!activity) { toast.error(l === "ru" ? "Выберите активность" : l === "kk" ? "Белсенділікті таңдаңыз" : "Select activity"); return; }
    setLoading(true);
    try {
      const res = await recommendAPI.get({ activity, city, level, limit: 6 });
      setResult(res.data);
    } catch {
      toast.error("Ошибка загрузки рекомендаций");
    } finally {
      setLoading(false);
    }
  }, [activity, city, level, l]);

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen">
        {/* Форма */}
        <div className="bg-navy py-14 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle,white 1px,transparent 1px)", backgroundSize: "36px 36px" }}
          />
          <div className="container-page relative z-10 max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-ice/15 border border-ice/30 rounded-full px-4 py-1.5 mb-4">
                <Sparkles className="w-4 h-4 text-ice" />
                <span className="text-ice text-sm font-semibold">
                  {l === "ru" ? "Персональный AI-рекомендатор" : l === "kk" ? "Жеке AI кеңесші" : "Personal AI Advisor"}
                </span>
              </div>
              <h1 className="font-display text-white text-3xl md:text-4xl font-extrabold mb-3">
                {l === "ru" ? "Подберём снаряжение для вашей поездки" : l === "kk" ? "Сапарыңызға лайық жабдық табайық" : "Find the Right Gear for Your Trip"}
              </h1>
              <p className="text-white/60 text-sm">
                {l === "ru"
                  ? "AI учитывает погоду, вашу активность и популярность снаряжения"
                  : l === "kk"
                  ? "AI ауа райын, белсенділікті және жабдық танымалдығын ескереді"
                  : "AI considers weather, activity and gear popularity"}
              </p>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-3xl p-6">
              <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-3">
                {l === "ru" ? "Ваша активность:" : l === "kk" ? "Белсенділігіңіз:" : "Activity:"}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
                {ACTS.map((a) => (
                  <button
                    key={a.slug}
                    onClick={() => setActivity(a.slug)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all",
                      activity === a.slug
                        ? "bg-ice border-ice text-white scale-105"
                        : "bg-white/10 border-white/20 text-white/80 hover:bg-white/20",
                    )}
                  >
                    <span className="text-2xl">{a.icon}</span>
                    {getLabel(a)}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1.5">
                    {l === "ru" ? "Город" : l === "kk" ? "Қала" : "City"}
                  </p>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm [&>option]:text-navy [&>option]:bg-white"
                  >
                    {["Алматы", "Астана", "Шымкент", "Бишкек"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-wide mb-1.5">
                    {l === "ru" ? "Уровень" : l === "kk" ? "Деңгей" : "Level"}
                  </p>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm [&>option]:text-navy [&>option]:bg-white"
                  >
                    <option value="beginner">{l === "ru" ? "Начинающий" : l === "kk" ? "Бастаушы" : "Beginner"}</option>
                    <option value="intermediate">{l === "ru" ? "Средний" : l === "kk" ? "Орташа" : "Intermediate"}</option>
                    <option value="advanced">{l === "ru" ? "Продвинутый" : l === "kk" ? "Жетік" : "Advanced"}</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={loading || !activity}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all",
                  activity && !loading
                    ? "bg-ice hover:bg-ice-dark text-white shadow-lg"
                    : "bg-white/20 text-white/50 cursor-not-allowed",
                )}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {l === "ru" ? "Анализируем..." : l === "kk" ? "Талдап жатырмыз..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {l === "ru" ? "Подобрать снаряжение" : l === "kk" ? "Жабдықты таңдау" : "Get Recommendations"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Результаты */}
        {result && (
          <div className="container-page py-10">
            {/* Погода */}
            {result.temperature !== null && (
              <div className="flex items-center gap-4 bg-ice-pale border border-ice-light rounded-2xl px-5 py-4 mb-7 max-w-md">
                <span className="text-3xl">❄️</span>
                <div>
                  <div className="font-display font-extrabold text-xl text-ice">
                    {result.temperature !== null
                      ? `${result.temperature > 0 ? "+" : ""}${result.temperature}°C`
                      : ""}
                    {" "}
                    <span className="text-sm font-normal text-ice-dark">{result.weather}</span>
                  </div>
                  <p className="text-xs text-ice-dark">
                    {result.city} · {l === "ru" ? "учтено в рекомендациях" : l === "kk" ? "ұсыныстарда ескерілді" : "used in recommendations"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-navy">
                  {l === "ru" ? "Рекомендуем для вас" : l === "kk" ? "Сізге ұсынамыз" : "Recommended for You"}
                </h2>
                <p className="text-slate-500 text-sm">
                  {result.items.length} {l === "ru" ? "позиций" : l === "kk" ? "жабдық" : "items"}
                </p>
              </div>
              {result.items.length > 0 && (
                <button
                  onClick={() => {
                    result.items.forEach((it) => addToCart(it as any, 1, null, 1));
                    toast.success(`${result.items.length} ${l === "ru" ? "добавлено в корзину" : l === "kk" ? "себетке қосылды" : "added to cart"}`);
                  }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {l === "ru" ? `Добавить всё (${result.items.length})` : l === "kk" ? `Барлығын қосу (${result.items.length})` : `Add All (${result.items.length})`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {result.items.map((item) => {
                const n = l === "kk" ? (item as any).name_kk : l === "en" ? (item as any).name_en : item.name_ru;
                return (
                  <div key={item.id} className="card-base flex flex-col">
                    <div className="relative aspect-[4/3]">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={n}
                          fill
                          sizes="(max-width:640px) 100vw,33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-4xl">🎿</div>
                      )}
                      <div className="absolute top-3 left-3 bg-navy/80 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                        <Sparkles className="w-2.5 h-2.5 inline text-ice mr-1" />
                        {Math.round((item.score ?? 0) * 100)}%
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link href={`/${l}/equipment/${item.slug}`} className="hover:text-ice transition-colors">
                        <h3 className="font-display font-bold text-navy text-sm mb-1 line-clamp-2">{n}</h3>
                      </Link>
                      {item.recommendation_reason && (
                        <div className="bg-ice-pale border-l-2 border-ice rounded-r-lg px-3 py-2 mb-3">
                          <p className="text-xs text-ice-dark leading-relaxed">
                            🤖 {item.recommendation_reason}
                          </p>
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div>
                          <span className="price-tag text-lg">{formatPrice(item.price_per_day)}</span>
                          <span className="text-slate-400 text-xs ml-1">/ {l === "ru" ? "д." : l === "kk" ? "к." : "d."}</span>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              addToCart(item as any, 1, null, 1);
                              toast.success(n + (l === "ru" ? " добавлен" : l === "kk" ? " қосылды" : " added"));
                            }}
                            className="w-8 h-8 rounded-lg bg-ice-pale hover:bg-ice text-ice hover:text-white transition-all flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <Link
                            href={`/${l}/equipment/${item.slug}`}
                            className="btn-primary !py-1.5 !px-3 !text-xs group"
                          >
                            {l === "ru" ? "Арендовать" : l === "kk" ? "Жалға алу" : "Book"}
                            <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {cartCount > 0 && (
              <div className="text-center mt-10">
                <Link href={`/${l}/checkout`} className="btn-primary !px-8 !py-4 !text-base group inline-flex">
                  <ShoppingCart className="w-5 h-5" />
                  {l === "ru" ? `Оформить аренду (${cartCount})` : l === "kk" ? `Жалға алуды рәсімдеу (${cartCount})` : `Checkout (${cartCount})`}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
