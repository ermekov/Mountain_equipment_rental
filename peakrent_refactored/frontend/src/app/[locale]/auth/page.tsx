"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Mail,
  Mountain,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { authAPI } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores";
import type { Locale } from "@/lib/types";

type Mode = "login" | "register";

const text = {
  ru: {
    loginTab: "Вход",
    registerTab: "Регистрация",
    loginTitle: "Войти в аккаунт",
    registerTitle: "Создать аккаунт",
    verifyTitle: "Подтвердите email",
    loginSubtitle: "Вход по email или номеру телефона",
    registerSubtitle: "Укажите данные и подтвердите email",
    verifySubtitle: "Мы отправили код на",
    name: "Имя",
    email: "Email",
    phone: "Телефон",
    loginField: "Email или телефон",
    password: "Пароль",
    code: "Код из email",
    sendCode: "Получить код",
    registerBtn: "Зарегистрироваться",
    loginBtn: "Войти",
    resend: "Отправить повторно",
    resendIn: "Повторная отправка через",
    seconds: "с",
    changeData: "Изменить данные",
    backHome: "Вернуться на главную",
    fillAll: "Заполните все поля",
    fillCode: "Введите 6-значный код",
    shortPassword: "Пароль должен быть не короче 6 символов",
    invalidPhone: "Введите корректный номер",
    invalidEmail: "Введите корректный email",
    otpSent: "Код отправлен на email",
    registerSuccess: "Аккаунт создан",
    loginSuccess: "С возвращением",
    genericSmsError: "Ошибка отправки кода",
    genericLoginError: "Ошибка входа",
  },
  kk: {
    loginTab: "Кіру",
    registerTab: "Тіркелу",
    loginTitle: "Аккаунтқа кіру",
    registerTitle: "Аккаунт ашу",
    verifyTitle: "Email растау",
    loginSubtitle: "Email немесе телефон арқылы кіру",
    registerSubtitle: "Мәліметтерді толтырып, email растаңыз",
    verifySubtitle: "Код мына email-ге жіберілді:",
    name: "Аты-жөні",
    email: "Email",
    phone: "Телефон нөмірі",
    loginField: "Email немесе телефон",
    password: "Құпия сөз",
    code: "Email коды",
    sendCode: "Код алу",
    registerBtn: "Тіркелу",
    loginBtn: "Кіру",
    resend: "Қайта жіберу",
    resendIn: "Қайта жіберу уақыты",
    seconds: "с",
    changeData: "Деректерді өзгерту",
    backHome: "Басты бетке оралу",
    fillAll: "Барлық өрісті толтырыңыз",
    fillCode: "6 таңбалы кодты енгізіңіз",
    shortPassword: "Құпия сөз кемінде 6 таңба болуы керек",
    invalidPhone: "Дұрыс нөмір енгізіңіз",
    invalidEmail: "Дұрыс email енгізіңіз",
    otpSent: "Код email-ге жіберілді",
    registerSuccess: "Аккаунт ашылды",
    loginSuccess: "Қайта келдіңіз",
    genericSmsError: "Код жіберу қатесі",
    genericLoginError: "Кіру қатесі",
  },
  en: {
    loginTab: "Login",
    registerTab: "Register",
    loginTitle: "Sign in",
    registerTitle: "Create account",
    verifyTitle: "Verify email",
    loginSubtitle: "Sign in with email or phone number",
    registerSubtitle: "Fill in your details and verify your email",
    verifySubtitle: "We sent a code to",
    name: "Name",
    email: "Email",
    phone: "Phone number",
    loginField: "Email or phone",
    password: "Password",
    code: "Email code",
    sendCode: "Get code",
    registerBtn: "Register",
    loginBtn: "Sign in",
    resend: "Resend code",
    resendIn: "Resend in",
    seconds: "s",
    changeData: "Change details",
    backHome: "Back to home",
    fillAll: "Fill in all fields",
    fillCode: "Enter the 6-digit code",
    shortPassword: "Password must be at least 6 characters",
    invalidPhone: "Enter a valid phone number",
    invalidEmail: "Enter a valid email",
    otpSent: "Code sent to email",
    registerSuccess: "Account created",
    loginSuccess: "Welcome back",
    genericSmsError: "Failed to send code",
    genericLoginError: "Login failed",
  },
} as const;

export default function AuthPage({ params }: { params: { locale: string } }) {
  const locale = params.locale as Locale;
  const t = text[locale] ?? text.en;
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<Mode>("login");
  const [registerStep, setRegisterStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [loginValue, setLoginValue] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+7 ");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const formatPhone = (raw: string): string => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (!digits.startsWith("7")) digits = "7" + digits;
    digits = digits.slice(0, 11);

    let result = "+" + digits[0];
    if (digits.length > 1) result += " (" + digits.slice(1, 4);
    if (digits.length > 4) result += ") " + digits.slice(4, 7);
    if (digits.length > 7) result += "-" + digits.slice(7, 9);
    if (digits.length > 9) result += "-" + digits.slice(9, 11);
    return result;
  };

  const normalizedPhone = () => "+" + phone.replace(/\D/g, "").slice(0, 11);
  const normalizedEmail = () => email.trim().toLowerCase();

  const resetRegisterFlow = () => {
    setRegisterStep("form");
    setOtp("");
    setCountdown(0);
  };

  const sendOtp = useCallback(async () => {
    const normalizedEmailValue = normalizedEmail();
    if (!name.trim() || !normalizedEmailValue || !password || phone.replace(/\D/g, "").length < 11) {
      toast.error(!phone.trim() || phone.replace(/\D/g, "").length < 11 ? t.invalidPhone : t.fillAll);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmailValue)) {
      toast.error(t.invalidEmail);
      return;
    }
    if (password.length < 6) {
      toast.error(t.shortPassword);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.sendOtp({ email: normalizedEmailValue });
      setRegisterStep("otp");
      setCountdown(60);
      if (res.data.dev_code) {
        toast.info(`DEV: ${res.data.dev_code}`);
      } else {
        toast.success(t.otpSent);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? t.genericSmsError);
    } finally {
      setLoading(false);
    }
  }, [email, name, password, phone, t]);

  const handleRegister = useCallback(async () => {
    if (otp.length !== 6) {
      toast.error(t.fillCode);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: normalizedPhone(),
        password,
        code: otp,
      });
      setAuth(res.data.user, res.data.access_token);
      toast.success(`${t.registerSuccess}, ${res.data.user.name}!`);
      router.push(`/${locale}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? t.genericLoginError);
    } finally {
      setLoading(false);
    }
  }, [email, locale, name, otp, password, router, setAuth, t]);

  const handleLogin = useCallback(async () => {
    if (!loginValue.trim() || !loginPassword) {
      toast.error(t.fillAll);
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.login({
        login: loginValue.trim(),
        password: loginPassword,
      });
      setAuth(res.data.user, res.data.access_token);
      toast.success(`${t.loginSuccess}, ${res.data.user.name}!`);
      router.push(`/${locale}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? t.genericLoginError);
    } finally {
      setLoading(false);
    }
  }, [locale, loginPassword, loginValue, router, setAuth, t]);

  const title =
    mode === "login"
      ? t.loginTitle
      : registerStep === "form"
        ? t.registerTitle
        : t.verifyTitle;

  const subtitle =
    mode === "login"
      ? t.loginSubtitle
      : registerStep === "form"
        ? t.registerSubtitle
        : `${t.verifySubtitle} ${email.trim()}`;

  return (
    <>
      <Navbar locale={locale} />
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-2 text-navy font-display font-extrabold text-xl"
            >
              <Mountain className="w-6 h-6 text-ice" />
              Peak<span className="text-ice">Rent</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-navy px-7 py-6 text-center">
              <div className="w-12 h-12 bg-ice/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                {mode === "login" ? (
                  <Lock className="w-6 h-6 text-ice" />
                ) : registerStep === "form" ? (
                  <UserRound className="w-6 h-6 text-ice" />
                ) : (
                  <Mail className="w-6 h-6 text-ice" />
                )}
              </div>

              <div className="grid grid-cols-2 bg-white/10 rounded-xl p-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    resetRegisterFlow();
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "login" ? "bg-white text-navy" : "text-white/70"
                  }`}
                >
                  {t.loginTab}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    resetRegisterFlow();
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "register" ? "bg-white text-navy" : "text-white/70"
                  }`}
                >
                  {t.registerTab}
                </button>
              </div>

              <h1 className="font-display font-extrabold text-xl text-white mb-1">{title}</h1>
              <p className="text-white/60 text-sm">{subtitle}</p>
            </div>

            <div className="p-7">
              {mode === "login" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.loginField}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={loginValue}
                        onChange={(e) => setLoginValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        placeholder="email@example.com / +7 777 000 00 00"
                        className="input-base pl-10"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.password}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                        className="input-base pl-10"
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <button onClick={handleLogin} disabled={loading} className="btn-primary w-full !py-3.5">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      t.loginBtn
                    )}
                  </button>
                </div>
              ) : registerStep === "form" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.name}
                    </label>
                    <div className="relative">
                      <UserRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-base pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.email}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-base pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.phone}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="input-base pl-10"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.password}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                        className="input-base pl-10"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <button onClick={sendOtp} disabled={loading} className="btn-primary w-full !py-3.5">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      t.sendCode
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    onClick={resetRegisterFlow}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-navy text-sm mb-5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t.changeData}
                  </button>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      {t.code}
                    </label>
                    <div className="flex gap-2 justify-center">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <input
                          key={index}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={otp[index] ?? ""}
                          onChange={(e) => {
                            const digit = e.target.value.replace(/\D/g, "").slice(-1);
                            const next = otp.split("");
                            next[index] = digit;
                            setOtp(next.join("").slice(0, 6));
                            if (digit && index < 5) {
                              (document.querySelectorAll(".otp-box")[index + 1] as HTMLElement)?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !otp[index] && index > 0) {
                              (document.querySelectorAll(".otp-box")[index - 1] as HTMLElement)?.focus();
                            }
                            if (e.key === "Enter") handleRegister();
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                            setOtp(pasted);
                            e.preventDefault();
                          }}
                          className="otp-box w-10 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all text-navy bg-white focus:outline-none"
                          style={{ borderColor: otp[index] ? "#0EA5E9" : "#E2E8F0" }}
                        />
                      ))}
                    </div>
                  </div>

                  <button onClick={handleRegister} disabled={loading} className="btn-primary w-full !py-3.5 mb-4">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
                    ) : (
                      t.registerBtn
                    )}
                  </button>

                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-slate-400">
                        {t.resendIn} {countdown}
                        {t.seconds}
                      </p>
                    ) : (
                      <button
                        onClick={sendOtp}
                        className="flex items-center gap-1.5 mx-auto text-sm text-ice hover:text-ice-dark transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t.resend}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-center mt-4 text-sm text-slate-400">
            <Link href={`/${locale}`} className="hover:text-navy transition-colors">
              ← {t.backHome}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
