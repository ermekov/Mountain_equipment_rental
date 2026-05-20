"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Heart,
  LogOut,
  Package,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Navbar } from "@/components/layout/navbar";
import { bookingAPI, favoriteAPI } from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores";
import type { Booking, Equipment, Locale } from "@/lib/types";
import { cn, formatDate, formatPrice } from "@/lib/utils";

type TabKey = "active" | "history" | "favorites";
type TimelineStep = { key: string; label: string; active: boolean; muted?: boolean };

export default function ProfilePage({ params }: { params: { locale: string } }) {
  const l = params.locale as Locale;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearAuth);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [favorites, setFavorites] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("active");

  useEffect(() => {
    if (!user) {
      router.push(`/${l}/auth`);
      return;
    }

    Promise.all([bookingAPI.list(), favoriteAPI.list()])
      .then(([bookingsRes, favoritesRes]) => {
        setBookings(bookingsRes.data);
        setFavorites(favoritesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, l, router]);

  const dictionary = {
    logout: l === "ru" ? "Выйти" : l === "kk" ? "Шығу" : "Logout",
    total: l === "ru" ? "Всего" : l === "kk" ? "Барлығы" : "Total",
    active: l === "ru" ? "Активные" : l === "kk" ? "Белсенді" : "Active",
    history: l === "ru" ? "История" : l === "kk" ? "Тарих" : "History",
    favorites: l === "ru" ? "Избранное" : l === "kk" ? "Таңдаулы" : "Favorites",
    spent: l === "ru" ? "Потрачено" : l === "kk" ? "Жұмсалды" : "Spent",
    noBookings: l === "ru" ? "Нет бронирований" : l === "kk" ? "Броньдар жоқ" : "No bookings",
    noFavorites: l === "ru" ? "Нет избранного" : l === "kk" ? "Таңдаулы жоқ" : "No favorites yet",
    browseCatalog: l === "ru" ? "В каталог" : l === "kk" ? "Каталогқа өту" : "Browse Catalog",
    cancel: l === "ru" ? "Отменить" : l === "kk" ? "Тоқтату" : "Cancel",
    removeFavorite: l === "ru" ? "Убрать" : l === "kk" ? "Өшіру" : "Remove",
    open: l === "ru" ? "Открыть" : l === "kk" ? "Ашу" : "Open",
    daysShort: l === "ru" ? "дн." : l === "kk" ? "к." : "d.",
    confirmCancel: l === "ru" ? "Отменить бронирование?" : l === "kk" ? "Броньды тоқтатасыз ба?" : "Cancel booking?",
    cancelled: l === "ru" ? "Отменено" : l === "kk" ? "Тоқтатылды" : "Cancelled",
    removedFavorite: l === "ru" ? "Удалено из избранного" : l === "kk" ? "Таңдаулылардан өшірілді" : "Removed from favorites",
    favoriteRemoveError: l === "ru" ? "Не удалось удалить из избранного" : l === "kk" ? "Таңдаулылардан өшіру сәтсіз болды" : "Failed to remove favorite",
  };

  const activeBookings = useMemo(
    () => bookings.filter((b) => ["confirmed", "pending"].includes(b.status)),
    [bookings]
  );
  const historyBookings = useMemo(
    () => bookings.filter((b) => ["completed", "cancelled"].includes(b.status)),
    [bookings]
  );
  const shownBookings = tab === "active" ? activeBookings : historyBookings;
  const spent = useMemo(
    () => bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.total_price, 0),
    [bookings]
  );

  const statusMeta = {
    confirmed: { label: l === "ru" ? "Подтверждено" : l === "kk" ? "Расталды" : "Confirmed", icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-green-50 text-green-700" },
    pending: { label: l === "ru" ? "Ожидает" : l === "kk" ? "Күтілуде" : "Pending", icon: <Clock className="h-3 w-3" />, cls: "bg-amber-50 text-amber-700" },
    cancelled: { label: l === "ru" ? "Отменено" : l === "kk" ? "Тоқтатылды" : "Cancelled", icon: <XCircle className="h-3 w-3" />, cls: "bg-red-50 text-red-600" },
    completed: { label: l === "ru" ? "Завершено" : l === "kk" ? "Аяқталды" : "Completed", icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-slate-100 text-slate-500" },
  } as const;

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

  const cancelBooking = async (id: number) => {
    if (!confirm(dictionary.confirmCancel)) return;

    try {
      await bookingAPI.cancel(id);
      setBookings((prev) => prev.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item)));
      toast.success(dictionary.cancelled);
    } catch {
      toast.error("Ошибка");
    }
  };

  const removeFavorite = async (equipmentId: number) => {
    try {
      await favoriteAPI.remove(equipmentId);
      setFavorites((prev) => prev.filter((item) => item.id !== equipmentId));
      toast.success(dictionary.removedFavorite);
    } catch {
      toast.error(dictionary.favoriteRemoveError);
    }
  };

  if (!user) return null;

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen bg-surface py-8">
        <div className="container-page max-w-4xl">
          <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-navy">
                <span className="font-display text-xl font-extrabold text-ice">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="font-display text-xl font-extrabold text-navy">{user.name}</h1>
                <p className="text-sm text-slate-500">{user.phone}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push(`/${l}`);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                {dictionary.logout}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
              {[
                { value: bookings.length, label: dictionary.total },
                { value: activeBookings.length, label: dictionary.active },
                { value: formatPrice(spent), label: dictionary.spent },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-lg font-extrabold text-navy">{stat.value}</div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100 p-1">
            {([
              { key: "active" as const, label: `${dictionary.active} (${activeBookings.length})` },
              { key: "history" as const, label: `${dictionary.history} (${historyBookings.length})` },
              { key: "favorites" as const, label: `${dictionary.favorites} (${favorites.length})` },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all",
                  tab === item.key ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
              ))}
            </div>
          ) : tab === "favorites" ? (
            favorites.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center">
                <Heart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <h2 className="mb-2 font-display text-lg font-bold text-navy">{dictionary.noFavorites}</h2>
                <Link href={`/${l}/catalog`} className="btn-primary mt-3 inline-flex">
                  {dictionary.browseCatalog}
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((item) => {
                  const itemName = l === "kk" ? item.name_kk : l === "en" ? item.name_en : item.name_ru;
                  const categoryName =
                    l === "kk" ? item.category?.name_kk : l === "en" ? item.category?.name_en : item.category?.name_ru;

                  return (
                    <div key={item.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                      <Link href={`/${l}/equipment/${item.slug}`} className="block">
                        <div className="relative aspect-[4/3] bg-slate-100">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={itemName}
                              fill
                              sizes="(max-width:768px) 100vw, 320px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-5xl">🎿</div>
                          )}
                        </div>
                      </Link>
                      <div className="p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-base font-bold text-navy">{itemName}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.category?.icon} {categoryName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFavorite(item.id)}
                            className="rounded-full bg-rose-50 p-2 text-rose-500 transition-colors hover:bg-rose-100"
                            aria-label="Remove favorite"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-display text-lg font-extrabold text-ice">
                            {formatPrice(item.price_per_day)}
                          </span>
                          <Link href={`/${l}/equipment/${item.slug}`} className="text-sm font-semibold text-navy hover:text-ice">
                            {dictionary.open}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : shownBookings.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h2 className="mb-2 font-display text-lg font-bold text-navy">{dictionary.noBookings}</h2>
              <Link href={`/${l}/catalog`} className="btn-primary mt-3 inline-flex">
                {dictionary.browseCatalog}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {shownBookings.map((booking) => {
                const firstItem = booking.items?.[0];
                const status = statusMeta[booking.status as keyof typeof statusMeta] ?? statusMeta.pending;

                return (
                  <div key={booking.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-start gap-3 p-4">
                      {firstItem?.equipment_image && (
                        <div className="relative h-12 w-14 flex-shrink-0 overflow-hidden rounded-xl">
                          <Image
                            src={firstItem.equipment_image}
                            alt={firstItem.equipment_name}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold text-navy">
                          {firstItem?.equipment_name ?? "—"}
                          {booking.items.length > 1 ? ` +${booking.items.length - 1}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDate(booking.start_date)} – {formatDate(booking.end_date)} · {booking.days} {dictionary.daysShort}
                        </p>

                        <div className="mt-2 flex items-center justify-between">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", status.cls)}>
                            {status.icon}
                            {status.label}
                          </span>
                          {booking.status === "confirmed" && (
                            <button onClick={() => cancelBooking(booking.id)} className="text-xs text-red-500 hover:underline">
                              {dictionary.cancel}
                            </button>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          {buildTimeline(booking).map((step, index, timeline) => (
                            <div key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
                              <div className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full", step.active ? "bg-ice" : "bg-slate-200")} />
                              <span
                                className={cn(
                                  "truncate text-[11px] leading-none",
                                  step.active ? "font-semibold text-navy" : "text-slate-400",
                                  step.muted && "text-slate-300"
                                )}
                              >
                                {step.label}
                              </span>
                              {index < timeline.length - 1 && (
                                <div className={cn("h-px min-w-3 flex-1", step.active && timeline[index + 1]?.active ? "bg-ice/60" : "bg-slate-200")} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="font-display text-base font-bold text-ice">{formatPrice(booking.total_price)}</span>
                        <p className="font-mono text-xs text-slate-400">#{booking.id}</p>
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
