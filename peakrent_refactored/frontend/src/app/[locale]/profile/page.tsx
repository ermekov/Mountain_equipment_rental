"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Package, LogOut, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores";
import { bookingAPI } from "@/lib/api/client";
import { Navbar } from "@/components/layout/navbar";
import type { Locale, Booking } from "@/lib/types";

type TimelineStep = {
  key: string;
  label: string;
  active: boolean;
  muted?: boolean;
};

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const l      = params.locale as Locale;
  const router = useRouter();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearAuth);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"active" | "history">("active");

  useEffect(() => {
    if (!user) { router.push(`/${l}/auth`); return; }
    bookingAPI.list()
      .then((r) => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, l, router]);

  if (!user) return null;

  const active  = bookings.filter((b) => ["confirmed", "pending"].includes(b.status));
  const history = bookings.filter((b) => ["completed", "cancelled"].includes(b.status));
  const shown   = tab === "active" ? active : history;
  const spent   = bookings.filter((b) => b.status === "completed")
                          .reduce((s, b) => s + b.total_price, 0);

  const cancel = async (id: number) => {
    if (!confirm(l === "ru" ? "Отменить бронирование?" : l === "kk" ? "Броньды тоқтатасыз ба?" : "Cancel booking?")) return;
    try {
      await bookingAPI.cancel(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "cancelled" as any } : b));
      toast.success(l === "ru" ? "Отменено" : l === "kk" ? "Тоқтатылды" : "Cancelled");
    } catch {
      toast.error("Ошибка");
    }
  };

  const STATUS = {
    confirmed: { label: "Подтверждено", icon: <CheckCircle2 className="w-3 h-3" />, cls: "bg-green-50 text-green-700"  },
    pending:   { label: "Ожидает",      icon: <Clock className="w-3 h-3" />,         cls: "bg-amber-50 text-amber-700"  },
    cancelled: { label: "Отменено",     icon: <XCircle className="w-3 h-3" />,       cls: "bg-red-50 text-red-600"      },
    completed: { label: "Завершено",    icon: <CheckCircle2 className="w-3 h-3" />,  cls: "bg-slate-100 text-slate-500" },
  };

  const buildTimeline = (booking: Booking): TimelineStep[] => {
    const labels = {
      created: l === "ru" ? "Создано" : l === "kk" ? "Құрылды" : "Created",
      confirmed: l === "ru" ? "Подтверждено" : l === "kk" ? "Расталды" : "Confirmed",
      completed: l === "ru" ? "Завершено" : l === "kk" ? "Аяқталды" : "Completed",
      cancelled: l === "ru" ? "Отменено" : l === "kk" ? "Тоқтатылды" : "Cancelled",
    };

    if (booking.status === "cancelled") {
      return [
        { key: "created", label: labels.created, active: true },
        { key: "cancelled", label: labels.cancelled, active: true },
      ];
    }

    return [
      { key: "created", label: labels.created, active: true },
      { key: "confirmed", label: labels.confirmed, active: ["confirmed", "completed"].includes(booking.status) },
      { key: "completed", label: labels.completed, active: booking.status === "completed", muted: booking.status !== "completed" },
    ];
  };

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen bg-surface py-8">
        <div className="container-page max-w-2xl">
          {/* Карточка профиля */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-navy flex items-center justify-center flex-shrink-0">
                <span className="font-display font-extrabold text-xl text-ice">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="font-display font-extrabold text-xl text-navy">{user.name}</h1>
                <p className="text-slate-500 text-sm">{user.phone}</p>
              </div>
              <button
                onClick={() => { logout(); router.push(`/${l}`); }}
                className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 text-sm px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {l === "ru" ? "Выйти" : l === "kk" ? "Шығу" : "Logout"}
              </button>
            </div>
            {/* Статистика */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
              {[
                { v: bookings.length,       lbl: l === "ru" ? "Всего"    : l === "kk" ? "Барлығы" : "Total"  },
                { v: active.length,          lbl: l === "ru" ? "Активных" : l === "kk" ? "Белсенді" : "Active" },
                { v: formatPrice(spent), lbl: l === "ru" ? "Потрачено" : l === "kk" ? "Жұмсалды" : "Spent"  },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-display font-extrabold text-lg text-navy">{s.v}</div>
                  <div className="text-xs text-slate-500">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Вкладки */}
          <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-4">
            {(["active", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  tab === t ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy",
                )}
              >
                {t === "active"
                  ? (l === "ru" ? `Активные (${active.length})` : l === "kk" ? `Белсенді (${active.length})` : `Active (${active.length})`)
                  : (l === "ru" ? `История (${history.length})` : l === "kk" ? `Тарих (${history.length})` : `History (${history.length})`)}
              </button>
            ))}
          </div>

          {/* Список бронирований */}
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 h-20 animate-pulse" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="font-display font-bold text-navy mb-2">
                {l === "ru" ? "Нет бронирований" : l === "kk" ? "Броньдар жоқ" : "No bookings"}
              </h2>
              <Link href={`/${l}/catalog`} className="btn-primary mt-3 inline-flex">
                {l === "ru" ? "В каталог" : l === "kk" ? "Каталогқа өту" : "Browse Catalog"}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {shown.map((b) => {
                const st       = STATUS[b.status as keyof typeof STATUS] ?? STATUS.pending;
                const firstItem = b.items?.[0];
                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex gap-3 p-4 items-start">
                      {firstItem?.equipment_image && (
                        <div className="relative w-14 h-12 rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={firstItem.equipment_image}
                            alt={firstItem.equipment_name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm text-navy truncate">
                          {firstItem?.equipment_name ?? "—"}
                          {b.items.length > 1 ? ` +${b.items.length - 1}` : ""}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(b.start_date)} – {formatDate(b.end_date)} · {b.days} {l === "ru" ? "дн." : l === "kk" ? "к." : "d."}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full",
                            st.cls,
                          )}>
                            {st.icon}
                            {st.label}
                          </span>
                          {b.status === "confirmed" && (
                            <button
                              onClick={() => cancel(b.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              {l === "ru" ? "Отменить" : l === "kk" ? "Тоқтату" : "Cancel"}
                            </button>
                          )}
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            {buildTimeline(b).map((step, index, timeline) => (
                              <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                                    step.active ? "bg-ice" : "bg-slate-200",
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-[11px] leading-none truncate",
                                    step.active ? "text-navy font-semibold" : "text-slate-400",
                                    step.muted && "text-slate-300",
                                  )}
                                >
                                  {step.label}
                                </span>
                                {index < timeline.length - 1 && (
                                  <div
                                    className={cn(
                                      "h-px flex-1 min-w-3",
                                      step.active && timeline[index + 1]?.active ? "bg-ice/60" : "bg-slate-200",
                                    )}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-display font-bold text-ice text-base">
                          {formatPrice(b.total_price)}
                        </span>
                        <p className="font-mono text-xs text-slate-400">#{b.id}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
