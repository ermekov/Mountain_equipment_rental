"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mountain, ShoppingCart, User, Menu, X, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useBookingStore } from "@/lib/stores";
import type { Locale } from "@/lib/types";

const LOCALES = [
  { code: "ru", label: "РУС" },
  { code: "kk", label: "ҚАЗ" },
  { code: "en", label: "ENG" },
];

export function Navbar({ locale }: { locale: Locale }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname  = usePathname();
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const cartCount = useBookingStore((s) => s.items.length);
  const l = locale;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function switchLocale(code: string) {
    const parts = pathname.split("/");
    parts[1] = code;
    router.push(parts.join("/") || `/${code}`);
  }

  const links = [
    { href: `/${l}/catalog`, label: l === "ru" ? "Каталог" : l === "kk" ? "Каталог" : "Catalog" },
    { href: `/${l}/ai`, label: l === "ru" ? "AI-подбор" : l === "kk" ? "AI ұсынысы" : "AI Picks", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || menuOpen ? "bg-navy shadow-lg" : "bg-navy/95 backdrop-blur-sm",
      )}>
        <div className="container-page">
          <div className="flex items-center justify-between h-14">
            {/* Логотип */}
            <Link href={`/${l}`} className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-ice" />
              <span className="font-display font-extrabold text-base text-white">
                Peak<span className="text-ice">Rent</span>
              </span>
            </Link>

            {/* Навигация десктоп */}
            <div className="hidden md:flex items-center gap-1">
              {links.map((link) => (
                <Link key={link.href} href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    pathname.startsWith(link.href)
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}>
                  {link.icon}{link.label}
                </Link>
              ))}
            </div>

            {/* Правая сторона */}
            <div className="flex items-center gap-2">
              {/* Переключатель языка */}
              <div className="hidden sm:flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
                {LOCALES.map((lc) => (
                  <button key={lc.code} onClick={() => switchLocale(lc.code)}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold transition-all",
                      l === lc.code ? "bg-white text-navy" : "text-white/60 hover:text-white",
                    )}>
                    {lc.label}
                  </button>
                ))}
              </div>

              {/* Корзина */}
              {cartCount > 0 && (
                <Link href={`/${l}/checkout`}
                  className="relative flex items-center gap-1.5 bg-ice text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-ice-dark transition-colors">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{cartCount}</span>
                </Link>
              )}

              {/* Авторизация */}
              {user ? (
                <div className="flex items-center gap-1">
                  <Link href={`/${l}/profile`}
                    className="flex items-center gap-1.5 text-white/70 hover:text-white px-2 py-1.5 rounded-lg text-sm transition-colors">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:block max-w-[80px] truncate text-xs">{user.name}</span>
                  </Link>
                  {user.role === "admin" && (
                    <Link href={`/${l}/admin`}
                      className="text-ice/70 hover:text-ice text-xs px-2 py-1.5 transition-colors hidden sm:block">
                      Admin
                    </Link>
                  )}
                  {user.role === "manager" && (
                    <Link href={`/${l}/manager`}
                      className="text-amber-400/80 hover:text-amber-300 text-xs px-2 py-1.5 transition-colors hidden sm:block">
                      Менеджер
                    </Link>
                  )}
                  <button onClick={() => { clearAuth(); router.push(`/${l}`); }}
                    className="text-white/40 hover:text-white/70 p-1.5 transition-colors">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Link href={`/${l}/auth`}
                  className="bg-ice hover:bg-ice-dark text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
                  {l === "ru" ? "Войти" : l === "kk" ? "Кіру" : "Sign In"}
                </Link>
              )}

              {/* Кнопка мобильного меню */}
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-white/70 hover:text-white p-1.5">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Мобильное меню */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-3">
            <div className="container-page flex flex-col gap-1">
              {links.map((link) => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                  {link.icon}{link.label}
                </Link>
              ))}
              <div className="flex gap-1 mt-2 pt-2 border-t border-white/10">
                {LOCALES.map((lc) => (
                  <button key={lc.code}
                    onClick={() => { switchLocale(lc.code); setMenuOpen(false); }}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                      l === lc.code ? "bg-white text-navy" : "text-white/60 hover:text-white/80",
                    )}>
                    {lc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="h-14" />
    </>
  );
}
