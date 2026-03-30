"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, QrCode, CreditCard, Banknote, CheckCircle2, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils";
import { useBookingStore, useAuthStore } from "@/lib/stores";
import { paymentAPI } from "@/lib/api/client";
import { Navbar } from "@/components/layout/navbar";
import type { Locale, PaymentMethod } from "@/lib/types";

function StepDot({ n, state }: { n: number; state: "done" | "current" | "future" }) {
  return (
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
      state === "done"    ? "bg-green-500 text-white"
      : state === "current" ? "bg-navy text-white scale-110 shadow-lg"
      : "bg-slate-200 text-slate-400",
    )}>
      {state === "done" ? <Check className="w-4 h-4" /> : n}
    </div>
  );
}

function CheckoutInner({ locale }: { locale: Locale }) {
  const l         = locale;
  const router    = useRouter();
  const sp        = useSearchParams();
  const bookingId = sp.get("booking_id");

  const [step,     setStep]   = useState<1 | 2 | 3>(bookingId ? 2 : 1);
  const [name,     setName]   = useState("");
  const [phone,    setPhone]  = useState("+7 ");
  const [payMethod,setPay]    = useState<PaymentMethod>("kaspi_qr");
  const [qrCode,   setQrCode] = useState("");
  const [payId,    setPayId]  = useState("");
  const [payStatus,setPaySt]  = useState<"pending" | "paid" | "expired">("pending");
  const [loading,  setLoad]   = useState(false);

  const cartItems  = useBookingStore((s) => s.items);
  const clearCart  = useBookingStore((s) => s.clearCart);
  const totalPrice = useBookingStore((s) => s.totalPrice());
  const user       = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user) { setName(user.name); setPhone(user.phone); }
  }, [user]);

  // Опрос статуса оплаты каждые 3 секунды
  useEffect(() => {
    if (payStatus !== "pending" || !payId) return;
    const t = setInterval(async () => {
      try {
        const { data } = await paymentAPI.status(payId);
        if (data.status === "paid") {
          setPaySt("paid");
          clearCart();
          setTimeout(() => router.push(`/${l}/booking/${bookingId ?? "0"}/success`), 2000);
        } else if (data.status === "expired") {
          setPaySt("expired");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [payStatus, payId, bookingId, clearCart, router, l]);

  const handlePay = useCallback(async () => {
    if (!name.trim()) { toast.error("Введите имя"); return; }
    if (phone.replace(/\D/g, "").length < 11) { toast.error("Введите корректный номер"); return; }
    setLoad(true);
    try {
      if (payMethod === "kaspi_qr") {
        const { data } = await paymentAPI.kaspiInit({
          booking_id: bookingId ?? "cart",
          name,
          phone,
        });
        setQrCode(data.qr_code);
        setPayId(data.payment_id);
      } else if (payMethod === "card") {
        const { data } = await paymentAPI.cardInit({
          booking_id: bookingId ?? "cart",
          name,
          phone,
        });
        window.location.href = data.payment_url;
        return;
      }
      setStep(3);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Ошибка оплаты");
    } finally {
      setLoad(false);
    }
  }, [name, phone, payMethod, bookingId]);

  const steps = [
    l === "ru" ? "Подтверждение" : "Confirm",
    l === "ru" ? "Данные"        : "Details",
    l === "ru" ? "Оплата"        : "Payment",
  ];

  return (
    <div className="min-h-screen bg-surface py-10">
      <div className="container-page max-w-lg">
        <Link href={`/${l}`} className="flex items-center gap-2 mb-6 font-display font-extrabold text-lg text-navy">
          Peak<span className="text-ice">Rent</span>
        </Link>

        {/* Прогресс */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((lbl, i) => {
            const n = i + 1 as 1 | 2 | 3;
            const state = n < step ? "done" : n === step ? "current" : "future";
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <StepDot n={n} state={state} />
                  <span className="text-xs mt-1 text-slate-500 hidden sm:block whitespace-nowrap">{lbl}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "w-16 sm:w-24 h-px mx-2 mb-4 transition-all",
                    n < step ? "bg-green-500" : "bg-slate-200",
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          {/* Шаг 1 — Подтверждение */}
          {step === 1 && (
            <div className="p-7">
              <h2 className="font-display font-extrabold text-xl text-navy mb-5">
                {l === "ru" ? "Подтверждение заказа" : "Order Confirmation"}
              </h2>
              {cartItems.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 mb-4">{l === "ru" ? "Корзина пуста" : "Cart is empty"}</p>
                  <Link href={`/${l}/catalog`} className="btn-primary">
                    {l === "ru" ? "В каталог" : "Browse"}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {cartItems.map((item) => (
                      <div key={item.equipment_id} className="flex gap-3 p-3 bg-surface rounded-xl border border-slate-100">
                        <div className="relative w-14 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {item.equipment.image_url ? (
                            <Image
                              src={item.equipment.image_url}
                              alt={item.equipment.name_ru}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🎿</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-sm text-navy truncate">
                            {l === "kk" ? item.equipment.name_kk
                              : l === "en" ? item.equipment.name_en
                              : item.equipment.name_ru}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatPrice(item.equipment.price_per_day)} × {item.days} {l === "ru" ? "дн." : "d."} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-display font-bold text-navy text-sm">
                          {formatPrice(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-4 mb-5">
                    <span className="font-display font-bold text-navy">
                      {l === "ru" ? "Итого" : "Total"}
                    </span>
                    <span className="font-display font-extrabold text-xl text-ice">
                      {formatPrice(totalPrice)}
                    </span>
                  </div>
                  <button onClick={() => setStep(2)} className="btn-primary w-full !py-3.5">
                    {l === "ru" ? "Продолжить →" : "Continue →"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Шаг 2 — Данные */}
          {step === 2 && (
            <div className="p-7">
              <h2 className="font-display font-extrabold text-xl text-navy mb-5">
                {l === "ru" ? "Ваши данные" : "Your Details"}
              </h2>
              <div className="space-y-4 mb-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    {l === "ru" ? "Имя" : "Name"}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={l === "ru" ? "Айдос Бекенов" : "Your name"}
                    className="input-base"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    {l === "ru" ? "Телефон" : "Phone"}
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => {
                      let d = e.target.value.replace(/\D/g, "");
                      if (d.startsWith("8")) d = "7" + d.slice(1);
                      if (!d.startsWith("7")) d = "7" + d;
                      d = d.slice(0, 11);
                      let r = "+" + d[0];
                      if (d.length > 1) r += " (" + d.slice(1, 4);
                      if (d.length > 4) r += ") " + d.slice(4, 7);
                      if (d.length > 7) r += "-" + d.slice(7, 9);
                      if (d.length > 9) r += "-" + d.slice(9, 11);
                      setPhone(r);
                    }}
                    placeholder="+7 (707) 000-00-00"
                    className="input-base"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    {l === "ru" ? "Способ оплаты" : "Payment Method"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "kaspi_qr" as PaymentMethod, icon: <QrCode className="w-5 h-5" />,     label: "Kaspi QR",                         rec: true  },
                      { id: "card"     as PaymentMethod, icon: <CreditCard className="w-5 h-5" />, label: l === "ru" ? "Карта" : "Card",       rec: false },
                      { id: "cash"     as PaymentMethod, icon: <Banknote className="w-5 h-5" />,   label: l === "ru" ? "Наличные" : "Cash",    rec: false },
                    ].map((pm) => (
                      <button
                        key={pm.id}
                        onClick={() => setPay(pm.id)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center text-xs font-semibold transition-all",
                          payMethod === pm.id
                            ? "border-ice bg-ice-pale text-navy"
                            : "border-slate-200 text-slate-500 hover:border-slate-300",
                        )}
                      >
                        {pm.rec && (
                          <span
                            className="absolute -top-2 left-1/2 -translate-x-1/2 bg-ice text-white font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{ fontSize: "9px" }}
                          >
                            {l === "ru" ? "Рекомендуем" : "Recommended"}
                          </span>
                        )}
                        <span className={payMethod === pm.id ? "text-ice" : ""}>{pm.icon}</span>
                        <span>{pm.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={handlePay} disabled={loading} className="btn-primary w-full !py-4 !text-base mb-3">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  l === "ru" ? `Оплатить ${formatPrice(totalPrice)}` : `Pay ${formatPrice(totalPrice)}`
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                {l === "ru" ? "Платёж защищён. Данные не сохраняются." : "Payment secured."}
              </div>
            </div>
          )}

          {/* Шаг 3 — Оплата */}
          {step === 3 && (
            <div className="p-7">
              <h2 className="font-display font-extrabold text-xl text-navy mb-2 text-center">
                {payStatus === "paid"
                  ? (l === "ru" ? "Оплата прошла! 🎉" : "Paid! 🎉")
                  : (l === "ru" ? "Ожидание оплаты" : "Waiting for payment")}
              </h2>
              <div className="flex flex-col items-center py-6">
                {payStatus === "paid" ? (
                  <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                ) : qrCode ? (
                  <div className="border-4 border-ice rounded-2xl p-3 mb-4 w-52 h-52 flex items-center justify-center">
                    <img src={qrCode} alt="Kaspi QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <QrCode className="w-16 h-16 text-ice mb-4" />
                )}

                <div className="font-display font-extrabold text-2xl text-ice mb-1">
                  {formatPrice(totalPrice)}
                </div>

                {payStatus === "pending" && (
                  <>
                    <p className="text-slate-500 text-sm mb-3">
                      {l === "ru"
                        ? "Откройте Kaspi → Оплатить → QR-код"
                        : "Open Kaspi → Pay → QR Code"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
                      <div className="w-3 h-3 border-2 border-ice/40 border-t-ice rounded-full animate-spin" />
                      {l === "ru" ? "Ожидание оплаты..." : "Waiting..."}
                    </div>
                    {/* Демо-кнопка */}
                    <button
                      onClick={() => {
                        setPaySt("paid");
                        clearCart();
                        setTimeout(() => router.push(`/${l}/booking/${bookingId ?? "0"}/success`), 1500);
                      }}
                      className="btn-primary text-sm"
                    >
                      ✓ {l === "ru" ? "Симулировать оплату (Demo)" : "Simulate Payment (Demo)"}
                    </button>
                  </>
                )}

                {payStatus === "expired" && (
                  <button onClick={handlePay} className="btn-secondary text-sm mt-2">
                    {l === "ru" ? "Обновить QR" : "Refresh QR"}
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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-ice/30 border-t-ice rounded-full animate-spin" />
        </div>
      }>
        <CheckoutInner locale={params.locale as Locale} />
      </Suspense>
    </>
  );
}
