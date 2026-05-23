"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, QrCode, CreditCard, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";

import { cn, formatPrice } from "@/lib/utils";
import { useBookingStore, useAuthStore } from "@/lib/stores";
import { bookingAPI, paymentAPI } from "@/lib/api/client";
import { Navbar } from "@/components/layout/navbar";
import type { Locale, PaymentMethod } from "@/lib/types";

function StepDot({ n, state }: { n: number; state: "done" | "current" | "future" }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
        state === "done"
          ? "bg-green-500 text-white"
          : state === "current"
          ? "scale-110 bg-navy text-white shadow-lg"
          : "bg-slate-200 text-slate-400"
      )}
    >
      {state === "done" ? <Check className="h-4 w-4" /> : n}
    </div>
  );
}

function CheckoutInner({ locale }: { locale: Locale }) {
  const l = locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  const [currentBookingIds, setCurrentBookingIds] = useState<string[]>(bookingId ? [bookingId] : []);
  const [step, setStep] = useState<1 | 2 | 3>(bookingId ? 2 : 1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("kaspi_qr");
  const [qrCode, setQrCode] = useState("");
  const [payId, setPayId] = useState("");
  const [payStatus, setPayStatus] = useState<"pending" | "paid" | "expired">("pending");
  const [loading, setLoading] = useState(false);
  const [displayTotal, setDisplayTotal] = useState(0);

  const cartItems = useBookingStore((s) => s.items);
  const clearCart = useBookingStore((s) => s.clearCart);
  const totalPrice = useBookingStore((s) => s.totalPrice());
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      toast.error(
        l === "ru"
          ? "Для оформления заказа нужно войти в аккаунт"
          : l === "kk"
          ? "Тапсырысты рәсімдеу үшін аккаунтқа кіру керек"
          : "Please sign in to continue"
      );
      router.replace(`/${l}/auth`);
    }
  }, [user, router, l]);

  useEffect(() => {
    setCurrentBookingIds(bookingId ? [bookingId] : []);
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      bookingAPI
        .getOne(bookingId)
        .then((res) => setDisplayTotal(res.data.total_price))
        .catch(() => setDisplayTotal(totalPrice));
      return;
    }
    setDisplayTotal(totalPrice);
  }, [bookingId, totalPrice]);

  useEffect(() => {
    if (payStatus !== "pending" || !payId) return;

    const timer = setInterval(async () => {
      try {
        const { data } = await paymentAPI.status(payId);
        if (data.status === "paid") {
          setPayStatus("paid");
          clearCart();
          setTimeout(() => router.push(`/${l}/booking/${currentBookingIds[0] ?? "0"}/success`), 2000);
        } else if (data.status === "expired") {
          setPayStatus("expired");
        }
      } catch {}
    }, 3000);

    return () => clearInterval(timer);
  }, [payStatus, payId, clearCart, router, l, currentBookingIds]);

  const handlePay = useCallback(async () => {
    if (!user) {
      toast.error(
        l === "ru"
          ? "Для оплаты нужно войти в аккаунт"
          : l === "kk"
          ? "Төлеу үшін аккаунтқа кіру керек"
          : "Please sign in to pay"
      );
      router.replace(`/${l}/auth`);
      return;
    }

    if (!name.trim()) {
      toast.error(l === "ru" ? "Введите имя" : l === "kk" ? "Атыңызды енгізіңіз" : "Enter your name");
      return;
    }

    if (phone.replace(/\D/g, "").length < 11) {
      toast.error(l === "ru" ? "Введите корректный номер" : l === "kk" ? "Дұрыс нөмір енгізіңіз" : "Enter a valid phone");
      return;
    }

    setLoading(true);

    try {
      let bookingIds = currentBookingIds;

      if (!bookingIds.length) {
        if (!cartItems.length) {
          toast.error(l === "ru" ? "Корзина пуста" : l === "kk" ? "Себет бос" : "Cart is empty");
          return;
        }

        const invalidItem = cartItems.find((item) => !item.start_date || !item.end_date || item.days < 1);
        if (invalidItem) {
          toast.error(
            l === "ru"
              ? "Проверьте даты аренды у всех позиций"
              : l === "kk"
              ? "Барлық позициялардың жалдау күндерін тексеріңіз"
              : "Check rental dates for all items"
          );
          return;
        }

        const bookingResponses = await Promise.all(
          cartItems.map((item) =>
            bookingAPI.create({
              items: [
                {
                  equipment_id: item.equipment_id,
                  quantity: item.quantity,
                  size: item.size || undefined,
                },
              ],
              start_date: item.start_date,
              end_date: item.end_date,
              payment_method: payMethod === "card" ? "card" : "kaspi",
              phone,
              name,
            })
          )
        );

        bookingIds = bookingResponses.map((res) => String(res.data.id));
        setCurrentBookingIds(bookingIds);
        setDisplayTotal(bookingResponses.reduce((sum, res) => sum + res.data.total_price, 0));
      }

      if (payMethod === "kaspi_qr") {
        const { data } = await paymentAPI.kaspiInit({
          booking_ids: bookingIds,
          name,
          phone,
        });
        setQrCode(data.qr_code);
        setPayId(data.payment_id);
      } else {
        const { data } = await paymentAPI.cardInit({
          booking_ids: bookingIds,
          name,
          phone,
        });
        window.location.href = data.payment_url;
        return;
      }

      setStep(3);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? (l === "ru" ? "Ошибка оплаты" : l === "kk" ? "Төлем қатесі" : "Payment error"));
    } finally {
      setLoading(false);
    }
  }, [user, name, phone, currentBookingIds, cartItems, payMethod, l, router]);

  const steps = [
    l === "ru" ? "Подтверждение" : l === "kk" ? "Растау" : "Confirm",
    l === "ru" ? "Данные" : l === "kk" ? "Деректер" : "Details",
    l === "ru" ? "Оплата" : l === "kk" ? "Төлем" : "Payment",
  ];

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="container-page max-w-lg">
        <Link href={`/${l}`} className="mb-6 flex items-center gap-2 font-display text-lg font-extrabold text-navy">
          Peak<span className="text-ice">Rent</span>
        </Link>

        <div className="mb-8 flex items-center justify-center gap-0">
          {steps.map((label, index) => {
            const n = (index + 1) as 1 | 2 | 3;
            const state = n < step ? "done" : n === step ? "current" : "future";
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <StepDot n={n} state={state} />
                  <span className="mt-1 hidden whitespace-nowrap text-xs text-slate-500 sm:block">{label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("mx-2 mb-4 h-px w-16 transition-all sm:w-24", n < step ? "bg-green-500" : "bg-slate-200")} />
                )}
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {step === 1 && (
            <div className="p-7">
              <h2 className="mb-5 font-display text-xl font-extrabold text-navy">
                {l === "ru" ? "Подтверждение заказа" : l === "kk" ? "Тапсырысты растау" : "Order confirmation"}
              </h2>
              {cartItems.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="mb-4 text-slate-400">{l === "ru" ? "Корзина пуста" : l === "kk" ? "Себет бос" : "Cart is empty"}</p>
                  <Link href={`/${l}/catalog`} className="btn-primary">
                    {l === "ru" ? "В каталог" : l === "kk" ? "Каталогқа" : "Browse"}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mb-5 space-y-3">
                    {cartItems.map((item) => (
                      <div key={item.equipment_id} className="flex gap-3 rounded-xl border border-slate-100 bg-surface p-3">
                        <div className="relative h-12 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {item.equipment.image_url ? (
                            <Image src={item.equipment.image_url} alt={item.equipment.name_ru} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xl">🎿</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-bold text-navy">
                            {l === "kk" ? item.equipment.name_kk : l === "en" ? item.equipment.name_en : item.equipment.name_ru}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.start_date} - {item.end_date} · {formatPrice(item.equipment.price_per_day)} × {item.days}{" "}
                            {l === "ru" ? "дн." : l === "kk" ? "к." : "d."} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-display text-sm font-bold text-navy">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-5 flex justify-between border-t border-slate-200 pt-4">
                    <span className="font-display font-bold text-navy">{l === "ru" ? "Итого" : l === "kk" ? "Барлығы" : "Total"}</span>
                    <span className="font-display text-xl font-extrabold text-ice">{formatPrice(displayTotal || totalPrice)}</span>
                  </div>
                  <button onClick={() => setStep(2)} className="btn-primary w-full !py-3.5">
                    {l === "ru" ? "Продолжить →" : l === "kk" ? "Жалғастыру →" : "Continue →"}
                  </button>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="p-7">
              <h2 className="mb-5 font-display text-xl font-extrabold text-navy">
                {l === "ru" ? "Ваши данные" : l === "kk" ? "Сіздің деректеріңіз" : "Your details"}
              </h2>
              <div className="mb-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {l === "ru" ? "Имя" : l === "kk" ? "Аты" : "Name"}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={l === "ru" ? "Айдос Бекенов" : l === "kk" ? "Атыңыз" : "Your name"}
                    className="input-base"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {l === "ru" ? "Телефон" : l === "kk" ? "Телефон" : "Phone"}
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => {
                      let digits = e.target.value.replace(/\D/g, "");
                      if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
                      if (!digits.startsWith("7")) digits = `7${digits}`;
                      digits = digits.slice(0, 11);

                      let formatted = `+${digits[0] ?? "7"}`;
                      if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
                      if (digits.length > 4) formatted += `) ${digits.slice(4, 7)}`;
                      if (digits.length > 7) formatted += `-${digits.slice(7, 9)}`;
                      if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`;

                      setPhone(formatted);
                    }}
                    placeholder="+7 (707) 000-00-00"
                    className="input-base"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    {l === "ru" ? "Способ оплаты" : l === "kk" ? "Төлем тәсілі" : "Payment method"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "kaspi_qr" as PaymentMethod, icon: <QrCode className="h-5 w-5" />, label: "Kaspi QR", recommended: true },
                      { id: "card" as PaymentMethod, icon: <CreditCard className="h-5 w-5" />, label: l === "ru" ? "Карта" : l === "kk" ? "Карта" : "Card", recommended: false },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPayMethod(method.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center text-xs font-semibold transition-all",
                          payMethod === method.id ? "border-ice bg-ice-pale text-navy" : "border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {method.recommended && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ice px-2 py-0.5 text-[9px] font-bold text-white">
                            {l === "ru" ? "Рекомендуем" : l === "kk" ? "Ұсынамыз" : "Recommended"}
                          </span>
                        )}
                        <span className={payMethod === method.id ? "text-ice" : ""}>{method.icon}</span>
                        <span>{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handlePay} disabled={loading} className="btn-primary mb-3 w-full !py-4 !text-base">
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : l === "ru" ? (
                  `Оплатить ${formatPrice(displayTotal || totalPrice)}`
                ) : l === "kk" ? (
                  `${formatPrice(displayTotal || totalPrice)} төлеу`
                ) : (
                  `Pay ${formatPrice(displayTotal || totalPrice)}`
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Shield className="h-3.5 w-3.5 text-green-500" />
                {l === "ru" ? "Платёж защищён. Данные не сохраняются." : l === "kk" ? "Төлем қорғалған. Деректер сақталмайды." : "Payment secured."}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-7">
              <h2 className="mb-2 text-center font-display text-xl font-extrabold text-navy">
                {payStatus === "paid"
                  ? l === "ru"
                    ? "Оплата прошла!"
                    : l === "kk"
                    ? "Төлем өтті!"
                    : "Paid!"
                  : l === "ru"
                  ? "Ожидание оплаты"
                  : l === "kk"
                  ? "Төлем күтілуде"
                  : "Waiting for payment"}
              </h2>
              <div className="flex flex-col items-center py-6">
                {payStatus === "paid" ? (
                  <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
                ) : qrCode ? (
                  <div className="mb-4 flex h-52 w-52 items-center justify-center rounded-2xl border-4 border-ice p-3">
                    <img src={qrCode} alt="Kaspi QR" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <QrCode className="mb-4 h-16 w-16 text-ice" />
                )}

                <div className="mb-1 font-display text-2xl font-extrabold text-ice">{formatPrice(displayTotal || totalPrice)}</div>

                {payStatus === "pending" && (
                  <>
                    <p className="mb-3 text-sm text-slate-500">
                      {l === "ru" ? "Откройте Kaspi → Оплатить → QR-код" : l === "kk" ? "Kaspi ашыңыз → Төлеу → QR код" : "Open Kaspi → Pay → QR Code"}
                    </p>
                    <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
                      {l === "ru" ? "Ожидание оплаты..." : l === "kk" ? "Төлем күтілуде..." : "Waiting..."}
                    </div>
                    <button
                      onClick={() => {
                        setPayStatus("paid");
                        clearCart();
                        setTimeout(() => router.push(`/${l}/booking/${currentBookingIds[0] ?? "0"}/success`), 1500);
                      }}
                      className="btn-primary text-sm"
                    >
                      {l === "ru" ? "Симулировать оплату (Demo)" : l === "kk" ? "Төлемді имитациялау (Demo)" : "Simulate payment (Demo)"}
                    </button>
                  </>
                )}

                {payStatus === "expired" && (
                  <button onClick={handlePay} className="btn-secondary mt-2 text-sm">
                    {l === "ru" ? "Обновить QR" : l === "kk" ? "QR жаңарту" : "Refresh QR"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: { locale: string } }) {
  return (
    <>
      <Navbar locale={params.locale as Locale} />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ice/30 border-t-ice" />
          </div>
        }
      >
        <CheckoutInner locale={params.locale as Locale} />
      </Suspense>
    </>
  );
}
