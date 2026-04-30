"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Star, Shield, Clock, Truck, Minus, Plus,
  Info, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { equipmentAPI, bookingAPI, reviewAPI, recommendAPI } from "@/lib/api/client";
import { cn, formatPrice, daysBetween } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores";
import type { Locale, Equipment, Review } from "@/lib/types";

export default function EquipmentPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  const l = params.locale as Locale;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [eq,       setEq]       = useState<Equipment | null>(null);
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [related,  setRelated]  = useState<Equipment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Booking state
  const [start,      setStart]      = useState("");
  const [end,        setEnd]        = useState("");
  const [qty,        setQty]        = useState(1);
  const [size,       setSize]       = useState("");
  const [insurance,  setInsurance]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const days  = useMemo(() => daysBetween(start, end), [start, end]);
  const total = useMemo(() => {
    if (!eq) return 0;
    return eq.price_per_day * days * qty + (insurance ? 1500 * days * qty : 0);
  }, [eq, days, qty, insurance]);

  useEffect(() => {
    Promise.all([
      equipmentAPI.getOne(params.slug),
      reviewAPI.list(0),
      recommendAPI.related(0, 3),
    ]).then(([eqRes]) => {
      setEq(eqRes.data);
      reviewAPI.list(eqRes.data.id).then((r) => setReviews(r.data)).catch(() => {});
      recommendAPI.related(eqRes.data.id, 3).then((r) => setRelated(r.data)).catch(() => {});
    }).catch(() => {
      toast.error("Снаряжение не найдено");
      router.push(`/${l}/catalog`);
    }).finally(() => setLoading(false));
  }, [params.slug, l, router]);

  const handleBook = useCallback(async () => {
    if (!eq) return;
    if (!start || !end) { toast.error("Выберите даты"); return; }
    if (days < 1) { toast.error("Минимум 1 день"); return; }
    if (eq.size_type !== "none" && !size) { toast.error("Выберите размер"); return; }
    setSubmitting(true);
    try {
      const res = await bookingAPI.create({
        items: [{ equipment_id: eq.id, quantity: qty, size: size || undefined }],
        start_date: start, end_date: end,
        payment_method: "kaspi",
        with_insurance: insurance,
      });
      router.push(`/${l}/checkout?booking_id=${res.data.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Ошибка бронирования");
    } finally {
      setSubmitting(false);
    }
  }, [eq, start, end, days, qty, size, insurance, l, router]);

  const handleReviewSubmit = useCallback(async () => {
    if (!eq) return;

    if (!user) {
      toast.error(l === "ru" ? "Сначала войдите в аккаунт" : l === "kk" ? "Алдымен аккаунтқа кіріңіз" : "Please sign in first");
      router.push(`/${l}/auth`);
      return;
    }

    setReviewSubmitting(true);
    try {
      const res = await reviewAPI.create({
        equipment_id: eq.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviews((current) => [res.data, ...current]);
      setReviewComment("");
      setReviewRating(5);
      toast.success(l === "ru" ? "Отзыв отправлен" : l === "kk" ? "Пікір жіберілді" : "Review submitted");
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? (l === "ru" ? "Не удалось отправить отзыв" : l === "kk" ? "Пікір жіберілмеді" : "Failed to submit review"));
    } finally {
      setReviewSubmitting(false);
    }
  }, [eq, l, reviewComment, reviewRating, router, user]);

  if (loading) {
    return (
      <>
        <Navbar locale={l} />
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-ice/30 border-t-ice rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (!eq) return null;

  const name = l === "kk" ? eq.name_kk : l === "en" ? eq.name_en : eq.name_ru;
  const desc = l === "kk" ? eq.description_kk : l === "en" ? eq.description_en : eq.description_ru;
  const catN = l === "kk" ? eq.category?.name_kk : l === "en" ? eq.category?.name_en : eq.category?.name_ru;

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen bg-surface">
        <div className="container-page py-6">
          {/* Хлебные крошки */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-5">
            <Link href={`/${l}`} className="hover:text-navy transition-colors">
              {l === "ru" ? "Главная" : l === "kk" ? "Басты бет" : "Home"}
            </Link>
            <ChevronLeft className="w-3 h-3 rotate-180" />
            <Link href={`/${l}/catalog`} className="hover:text-navy transition-colors">
              {l === "ru" ? "Каталог" : l === "kk" ? "Каталог" : "Catalog"}
            </Link>
            <ChevronLeft className="w-3 h-3 rotate-180" />
            <span className="text-navy font-medium truncate max-w-[200px]">{name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-8 items-start">
            {/* Левая колонка */}
            <div>
              {/* Главное фото */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 mb-3">
                {eq.image_url ? (
                  <Image
                    src={eq.image_url} alt={name} fill priority
                    sizes="(max-width:1024px) 100vw, 60vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl">🎿</div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="badge-category">{eq.category?.icon} {catN}</span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className={cn(
                    "text-xs font-bold px-2.5 py-1 rounded-full",
                    eq.stock === 0 ? "bg-red-50 text-red-600"
                    : eq.stock <= 2 ? "bg-amber-50 text-amber-700"
                    : "bg-green-50 text-green-700",
                  )}>
                    {eq.stock === 0
                      ? (l === "ru" ? "Нет в наличии" : l === "kk" ? "Қолжетімсіз" : "Out of stock")
                      : eq.stock <= 2
                      ? (l === "ru" ? `Осталось ${eq.stock} шт.` : l === "kk" ? `${eq.stock} дана қалды` : `${eq.stock} left`)
                      : (l === "ru" ? "Есть в наличии" : l === "kk" ? "Қолжетімді" : "In stock")}
                  </span>
                </div>
              </div>

              {/* Миниатюры */}
              {eq.images.length > 1 && (
                <div className="flex gap-2 mb-5">
                  {eq.images.slice(0, 4).map((img, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-xl overflow-hidden border-2 border-transparent hover:border-ice transition-colors">
                      <Image src={img} alt={`${name} ${i + 1}`} fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Заголовок (мобильный) */}
              <div className="lg:hidden mb-5">
                <h1 className="font-display text-2xl font-extrabold text-navy mb-2">{name}</h1>
                {eq.avg_rating && (
                  <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                    <span className="text-amber-400">{"★".repeat(Math.round(eq.avg_rating))}</span>
                    {eq.avg_rating} ({eq.review_count})
                  </div>
                )}
                <div>
                  <span className="price-tag text-3xl">{formatPrice(eq.price_per_day)}</span>
                  <span className="text-slate-400 text-sm ml-1">/ {l === "ru" ? "день" : l === "kk" ? "күн" : "day"}</span>
                </div>
              </div>

              {/* Теги */}
              <div className="flex flex-wrap gap-2 mb-5">
                {eq.tags.map((t) => (
                  <span key={t} className="bg-ice-pale text-ice-dark text-xs font-medium px-3 py-1 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>

              {/* Описание */}
              <div className="mb-6">
                <h2 className="font-display font-bold text-lg text-navy mb-2">
                  {l === "ru" ? "Описание" : l === "kk" ? "Сипаттама" : "Description"}
                </h2>
                <p className="text-slate-700 leading-relaxed text-sm">{desc}</p>
              </div>

              {/* Бейджи доверия */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: <Shield className="w-5 h-5 text-green-600" />, label: l === "ru" ? "Страховка"  : l === "kk" ? "Сақтандыру" : "Insurance", sub: l === "ru" ? "по запросу"  : l === "kk" ? "сұраныс бойынша" : "available" },
                  { icon: <Clock  className="w-5 h-5 text-ice"        />, label: l === "ru" ? "Выдача"     : l === "kk" ? "Беру" : "Pickup",    sub: l === "ru" ? "5 минут"     : l === "kk" ? "5 минут" : "5 minutes" },
                  { icon: <Truck  className="w-5 h-5 text-purple-500" />, label: l === "ru" ? "Доставка"   : l === "kk" ? "Жеткізу" : "Delivery",  sub: l === "ru" ? "на курорт"   : l === "kk" ? "курортқа" : "to resort" },
                  { icon: <span className="text-lg">💰</span>,             label: l === "ru" ? "Залог"      : l === "kk" ? "Кепілақы" : "Deposit",   sub: formatPrice(eq.deposit ?? 0) },
                ].map((b, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-1 p-3 bg-white rounded-xl border border-slate-200">
                    {b.icon}
                    <span className="font-display font-bold text-xs text-navy">{b.label}</span>
                    <span className="text-xs text-slate-500">{b.sub}</span>
                  </div>
                ))}
              </div>

              {/* Часто берут вместе */}
              {related.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-display font-bold text-lg text-navy mb-3">
                    {l === "ru" ? "Часто берут вместе" : l === "kk" ? "Жиі бірге алынады" : "Frequently Rented Together"}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {related.map((rel) => {
                      const rn = l === "kk" ? rel.name_kk : l === "en" ? rel.name_en : rel.name_ru;
                      return (
                        <Link
                          key={rel.id}
                          href={`/${l}/equipment/${rel.slug}`}
                          className="flex gap-3 p-3 bg-white rounded-2xl border border-slate-200 hover:border-ice/50 hover:shadow-md transition-all group"
                        >
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            {rel.image_url ? (
                              <Image src={rel.image_url} alt={rn} fill sizes="56px" className="object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl">🎿</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-sm text-navy truncate group-hover:text-ice transition-colors">{rn}</p>
                            <p className="text-sm mt-0.5">
                              <span className="price-tag text-base">{formatPrice(rel.price_per_day)}</span>
                              <span className="text-slate-400 text-xs ml-1">/ {l === "ru" ? "день" : l === "kk" ? "күн" : "day"}</span>
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Отзывы */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg text-navy">
                    {l === "ru" ? "Отзывы" : l === "kk" ? "Пікірлер" : "Reviews"}
                    {reviews.length > 0 && (
                      <span className="text-slate-500 font-normal text-base ml-2">({reviews.length})</span>
                    )}
                  </h2>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-display font-bold text-sm text-navy">
                        {l === "ru" ? "Оставить отзыв" : l === "kk" ? "Пікір жазу" : "Write a review"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {user
                          ? (l === "ru" ? "Поделитесь впечатлением о снаряжении" : l === "kk" ? "Жабдық туралы ойыңызды жазыңыз" : "Share your experience with this gear")
                          : (l === "ru" ? "Чтобы написать отзыв, войдите в аккаунт" : l === "kk" ? "Пікір жазу үшін аккаунтқа кіріңіз" : "Sign in to leave a review")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => user && setReviewRating(value)}
                          className={cn(
                            "transition-transform",
                            user ? "hover:scale-110" : "cursor-not-allowed opacity-70",
                          )}
                        >
                          <Star
                            className={cn(
                              "w-5 h-5",
                              value <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      l === "ru"
                        ? "Напишите, что понравилось или что можно улучшить"
                        : l === "kk"
                        ? "Не ұнағанын немесе нені жақсартуға болатынын жазыңыз"
                        : "Write what you liked or what could be improved"
                    }
                    disabled={!user || reviewSubmitting}
                    rows={4}
                    className="input-base min-h-28 resize-y"
                  />
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <span className="text-xs text-slate-400">
                      {reviewComment.trim().length}/500
                    </span>
                    <button
                      type="button"
                      onClick={handleReviewSubmit}
                      disabled={!user || reviewSubmitting || reviewComment.trim().length > 500}
                      className={cn(
                        "btn-primary !py-2.5 !px-5",
                        (!user || reviewSubmitting || reviewComment.trim().length > 500) && "opacity-60 cursor-not-allowed",
                      )}
                    >
                      {reviewSubmitting
                        ? (l === "ru" ? "Отправка..." : l === "kk" ? "Жіберілуде..." : "Submitting...")
                        : (l === "ru" ? "Отправить отзыв" : l === "kk" ? "Пікір жіберу" : "Submit review")}
                    </button>
                  </div>
                </div>
                {reviews.length === 0 ? (
                  <div className="text-center py-8 bg-surface rounded-2xl border border-slate-200">
                    <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">{l === "ru" ? "Отзывов пока нет" : l === "kk" ? "Әзірге пікір жоқ" : "No reviews yet"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-ice-pale flex items-center justify-center flex-shrink-0">
                            <span className="font-display font-bold text-sm text-ice-dark">
                              {r.user.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-display font-bold text-sm text-navy">{r.user.name}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}</span>
                                <span className="text-xs text-slate-400">
                                  {new Date(r.created_at).toLocaleDateString("ru-KZ")}
                                </span>
                              </div>
                            </div>
                            {r.comment && (
                              <p className="text-sm text-slate-700 leading-relaxed">{r.comment}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Правая колонка — бронирование */}
            <div className="lg:sticky lg:top-20">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Заголовок */}
                <div className="p-5 border-b border-slate-100">
                  <h2 className="font-display font-extrabold text-lg text-navy mb-1 hidden lg:block">{name}</h2>
                  {eq.avg_rating && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <span className="text-amber-400">{"★".repeat(Math.round(eq.avg_rating))}</span>
                      {eq.avg_rating} ({eq.review_count})
                    </div>
                  )}
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="price-tag text-4xl">{formatPrice(eq.price_per_day)}</span>
                    <span className="text-slate-400 text-sm">/ {l === "ru" ? "день" : l === "kk" ? "күн" : "day"}</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Даты */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {l === "ru" ? "Даты аренды" : l === "kk" ? "Жалдау күндері" : "Rental dates"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={start} min={today}
                        onChange={(e) => {
                          setStart(e.target.value);
                          if (!end || end <= e.target.value) {
                            const d = new Date(e.target.value);
                            d.setDate(d.getDate() + 1);
                            setEnd(d.toISOString().split("T")[0]);
                          }
                        }}
                        className="input-base !py-2.5 text-sm" />
                      <input type="date" value={end} min={start || today}
                        onChange={(e) => setEnd(e.target.value)}
                        className="input-base !py-2.5 text-sm" />
                    </div>
                  </div>

                  {/* Размеры */}
                  {eq.size_type !== "none" && eq.sizes.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        {l === "ru" ? "Размер" : l === "kk" ? "Өлшем" : "Size"}
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {eq.sizes.map((s) => (
                          <button
                            key={s.value}
                            onClick={() => setSize(s.value)}
                            className={cn(
                              "py-2 rounded-lg text-sm font-semibold border transition-all",
                              size === s.value
                                ? "bg-navy text-white border-navy"
                                : "bg-white text-navy border-slate-200 hover:border-navy/40",
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Количество */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {l === "ru" ? "Количество" : l === "kk" ? "Саны" : "Quantity"}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                        className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-display font-bold text-lg text-navy w-8 text-center">{qty}</span>
                      <button
                        onClick={() => setQty((q) => Math.min(eq.stock, q + 1))}
                        disabled={qty >= eq.stock}
                        className="w-9 h-9 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className={cn(
                        "text-xs font-medium",
                        eq.stock === 0 ? "text-red-500"
                        : eq.stock <= 2 ? "text-amber-600"
                        : "text-green-600",
                      )}>
                        {eq.stock === 0
                          ? (l === "ru" ? "Нет" : l === "kk" ? "Жоқ" : "N/A")
                          : eq.stock <= 2
                          ? (l === "ru" ? `Осталось ${eq.stock}` : l === "kk" ? `${eq.stock} қалды` : `${eq.stock} left`)
                          : (l === "ru" ? `${eq.stock} доступно` : l === "kk" ? `${eq.stock} қолжетімді` : `${eq.stock} available`)}
                      </span>
                    </div>
                  </div>

                  {/* Страховка */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={insurance}
                        onChange={(e) => setInsurance(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                        insurance
                          ? "bg-ice border-ice"
                          : "bg-white border-slate-300 group-hover:border-ice/60",
                      )}>
                        {insurance && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                        <Shield className="w-3.5 h-3.5 text-green-600" />
                        {l === "ru" ? "Страховка от повреждений" : l === "kk" ? "Зақымданудан сақтандыру" : "Damage Insurance"}
                      </div>
                      <span className="text-xs text-slate-500">
                        +{formatPrice(1500)} {l === "ru" ? "в день" : l === "kk" ? "күніне" : "/ day"}
                      </span>
                    </div>
                  </label>

                  {/* Расчёт цены */}
                  {days > 0 && (
                    <div className="bg-surface rounded-xl p-4 space-y-1.5 border border-slate-100">
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>
                          {formatPrice(eq.price_per_day)} × {days} {l === "ru" ? "дн." : l === "kk" ? "к." : "d."} × {qty}
                        </span>
                        <span className="text-navy font-medium">
                          {formatPrice(eq.price_per_day * days * qty)}
                        </span>
                      </div>
                      {insurance && (
                        <div className="flex justify-between text-sm text-slate-500">
                          <span>{l === "ru" ? "Страховка" : l === "kk" ? "Сақтандыру" : "Insurance"}</span>
                          <span className="text-navy font-medium">{formatPrice(1500 * days * qty)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="font-display font-bold text-navy">
                          {l === "ru" ? "Итого" : l === "kk" ? "Барлығы" : "Total"}
                        </span>
                        <span className="font-display font-extrabold text-xl text-ice">
                          {formatPrice(total)}
                        </span>
                      </div>
                      {eq.deposit > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 pt-1">
                          <Info className="w-3 h-3 flex-shrink-0" />
                          <span>
                            {l === "ru"
                              ? `Залог ${formatPrice(eq.deposit)} — возвращается при возврате`
                              : l === "kk"
                              ? `Кепілақы ${formatPrice(eq.deposit)} — қайтарғанда беріледі`
                              : `Deposit ${formatPrice(eq.deposit)} — returned on return`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Кнопка бронирования */}
                  <button
                    onClick={handleBook}
                    disabled={submitting || eq.stock === 0}
                    className={cn(
                      "btn-primary w-full !py-4 !text-base group",
                      eq.stock === 0 && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        {l === "ru" ? "Оформляем..." : l === "kk" ? "Рәсімделуде..." : "Processing..."}
                      </div>
                    ) : eq.stock === 0 ? (
                      l === "ru" ? "Нет в наличии" : l === "kk" ? "Қолжетімсіз" : "Out of Stock"
                    ) : !start || !end ? (
                      l === "ru" ? "Выберите даты" : l === "kk" ? "Күндерді таңдаңыз" : "Select dates"
                    ) : (
                      <span className="flex items-center gap-2">
                        {l === "ru" ? "Перейти к оплате" : l === "kk" ? "Төлемге өту" : "Proceed to Payment"}
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    💳 Kaspi QR · Visa/MC · {l === "ru" ? "Наличные" : l === "kk" ? "Қолма-қол" : "Cash"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
