"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mountain, Phone, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores";
import { authAPI } from "@/lib/api/client";
import { Navbar } from "@/components/layout/navbar";
import type { Locale } from "@/lib/types";

export default function AuthPage({ params }: { params: { locale: string } }) {
  const l      = params.locale as Locale;
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step,      setStep]      = useState<"phone" | "otp">("phone");
  const [phone,     setPhone]     = useState("+7 ");
  const [otp,       setOtp]       = useState("");
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Форматирование номера телефона
  const formatPhone = (raw: string): string => {
    let d = raw.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (!d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    let r = "+" + d[0];
    if (d.length > 1) r += " (" + d.slice(1, 4);
    if (d.length > 4) r += ") " + d.slice(4, 7);
    if (d.length > 7) r += "-" + d.slice(7, 9);
    if (d.length > 9) r += "-" + d.slice(9, 11);
    return r;
  };

  const sendOtp = useCallback(async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 11) {
      toast.error(l === "ru" ? "Введите корректный номер" : "Enter valid phone");
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendOtp({ phone: "+" + digits });
      setStep("otp");
      setCountdown(60);
      if (res.data.dev_code) toast.info(`DEV: код ${res.data.dev_code}`);
      else toast.success(l === "ru" ? "SMS отправлено!" : "SMS sent!");
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Ошибка отправки SMS");
    } finally {
      setLoading(false);
    }
  }, [phone, l]);

  const verifyOtp = useCallback(async () => {
    if (otp.length < 6) {
      toast.error(l === "ru" ? "Введите 6-значный код" : "Enter 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await authAPI.verifyOtp({ phone: "+" + digits, code: otp });
      setAuth(res.data.user, res.data.access_token);
      toast.success(l === "ru" ? `Добро пожаловать, ${res.data.user.name}!` : `Welcome, ${res.data.user.name}!`);
      router.push(`/${l}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? (l === "ru" ? "Неверный код" : "Invalid code"));
      setOtp("");
    } finally {
      setLoading(false);
    }
  }, [otp, phone, setAuth, router, l]);

  // Автоматическая проверка при заполнении 6 цифр
  useEffect(() => {
    if (otp.length === 6) verifyOtp();
  }, [otp, verifyOtp]);

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          {/* Логотип */}
          <div className="text-center mb-6">
            <Link href={`/${l}`} className="inline-flex items-center gap-2 text-navy font-display font-extrabold text-xl">
              <Mountain className="w-6 h-6 text-ice" />
              Peak<span className="text-ice">Rent</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Шапка */}
            <div className="bg-navy px-7 py-6 text-center">
              <div className="w-12 h-12 bg-ice/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-ice" />
              </div>
              <h1 className="font-display font-extrabold text-xl text-white mb-1">
                {step === "phone"
                  ? (l === "ru" ? "Войти или зарегистрироваться" : "Sign In or Register")
                  : (l === "ru" ? "Введите код из SMS" : "Enter SMS Code")}
              </h1>
              <p className="text-white/60 text-sm">
                {step === "phone"
                  ? (l === "ru" ? "Введите номер — отправим код" : "Enter number — we'll send a code")
                  : (l === "ru" ? `Отправили на ${phone}` : `Sent to ${phone}`)}
              </p>
            </div>

            <div className="p-7">
              {step === "phone" ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {l === "ru" ? "Номер телефона" : "Phone Number"}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      placeholder="+7 (707) 000-00-00"
                      className="input-base"
                      inputMode="tel"
                      autoComplete="tel"
                      autoFocus
                    />
                  </div>
                  <button onClick={sendOtp} disabled={loading} className="btn-primary w-full !py-3.5">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      l === "ru" ? "Получить код →" : "Get Code →"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setStep("phone"); setOtp(""); }}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-navy text-sm mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {l === "ru" ? "Изменить номер" : "Change number"}
                  </button>

                  {/* 6 боксов для OTP */}
                  <div className="flex gap-2 justify-center mb-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i] ?? ""}
                        onChange={(e) => {
                          const digit = e.target.value.replace(/\D/g, "").slice(-1);
                          const arr   = otp.split("");
                          arr[i]      = digit;
                          setOtp(arr.join("").slice(0, 6));
                          if (digit && i < 5) {
                            (document.querySelectorAll(".otp-box")[i + 1] as HTMLElement)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[i] && i > 0) {
                            (document.querySelectorAll(".otp-box")[i - 1] as HTMLElement)?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                          setOtp(p);
                          e.preventDefault();
                        }}
                        className="otp-box w-10 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all text-navy bg-white focus:outline-none"
                        style={{ borderColor: otp[i] ? "#0EA5E9" : "#E2E8F0" }}
                      />
                    ))}
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-4">
                      <div className="w-4 h-4 border-2 border-ice/30 border-t-ice rounded-full animate-spin" />
                      {l === "ru" ? "Проверяем код..." : "Verifying..."}
                    </div>
                  )}

                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-slate-400">
                        {l === "ru" ? `Повторная отправка через ${countdown} с` : `Resend in ${countdown}s`}
                      </p>
                    ) : (
                      <button
                        onClick={sendOtp}
                        className="flex items-center gap-1.5 mx-auto text-sm text-ice hover:text-ice-dark transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {l === "ru" ? "Отправить повторно" : "Resend code"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-center mt-4 text-sm text-slate-400">
            <Link href={`/${l}`} className="hover:text-navy transition-colors">
              ← {l === "ru" ? "Вернуться на главную" : "Back to home"}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
