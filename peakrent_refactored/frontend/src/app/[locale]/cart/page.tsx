"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { useBookingStore } from "@/lib/stores";
import type { Locale } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export default function CartPage({ params }: { params: { locale: string } }) {
  const l = params.locale as Locale;
  const items = useBookingStore((s) => s.items);
  const startDate = useBookingStore((s) => s.start_date);
  const endDate = useBookingStore((s) => s.end_date);
  const setRentalPeriod = useBookingStore((s) => s.setRentalPeriod);
  const updateItem = useBookingStore((s) => s.updateItem);
  const removeItem = useBookingStore((s) => s.removeItem);
  const totalPrice = useBookingStore((s) => s.totalPrice());

  const t = {
    title: l === "ru" ? "Корзина" : l === "kk" ? "Себет" : "Cart",
    subtitle:
      l === "ru"
        ? "Проверьте состав заказа и выберите единый период аренды для всех позиций."
        : l === "kk"
        ? "Тапсырыс құрамын тексеріп, барлық позицияға ортақ жалдау мерзімін таңдаңыз."
        : "Review your order and choose one rental period for all items.",
    empty: l === "ru" ? "Корзина пока пустая" : l === "kk" ? "Себет әзірге бос" : "Your cart is empty",
    browse: l === "ru" ? "В каталог" : l === "kk" ? "Каталогқа өту" : "Browse catalog",
    dates: l === "ru" ? "Даты аренды" : l === "kk" ? "Жалдау күндері" : "Rental dates",
    qty: l === "ru" ? "Количество" : l === "kk" ? "Саны" : "Quantity",
    size: l === "ru" ? "Размер" : l === "kk" ? "Өлшем" : "Size",
    total: l === "ru" ? "Итого" : l === "kk" ? "Барлығы" : "Total",
    checkout: l === "ru" ? "Перейти к оплате" : l === "kk" ? "Төлемге өту" : "Proceed to checkout",
    day: l === "ru" ? "день" : l === "kk" ? "күн" : "day",
    selectDates:
      l === "ru"
        ? "Сначала выберите даты аренды"
        : l === "kk"
        ? "Алдымен жалдау күндерін таңдаңыз"
        : "Select rental dates first",
  };

  const canCheckout = useMemo(() => items.length > 0 && !!startDate && !!endDate, [items.length, startDate, endDate]);

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen bg-surface py-8">
        <div className="container-page max-w-5xl">
          <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="font-display text-3xl font-black text-navy">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t.subtitle}</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white py-16 text-center">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h2 className="font-display text-lg font-bold text-navy">{t.empty}</h2>
              <Link href={`/${l}/catalog`} className="btn-primary mt-4 inline-flex">
                {t.browse}
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="space-y-4">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{t.dates}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setRentalPeriod(e.target.value, endDate)}
                      className="input-base"
                    />
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setRentalPeriod(startDate, e.target.value)}
                      className="input-base"
                    />
                  </div>
                </div>

                {items.map((item) => {
                  const name = l === "kk" ? item.equipment.name_kk : l === "en" ? item.equipment.name_en : item.equipment.name_ru;
                  return (
                    <div key={item.equipment_id} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex gap-4">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                          {item.equipment.image_url ? (
                            <Image src={item.equipment.image_url} alt={name} fill sizes="96px" className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-4xl">🎿</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-display text-lg font-bold text-navy">{name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.equipment.category?.icon} {l === "kk" ? item.equipment.category?.name_kk : l === "en" ? item.equipment.category?.name_en : item.equipment.category?.name_ru}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.equipment_id)}
                              className="rounded-full bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-4">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.qty}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateItem(item.equipment_id, Math.max(1, item.quantity - 1))}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-6 text-center font-semibold text-navy">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItem(item.equipment_id, item.quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {item.size && (
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.size}</p>
                                <p className="mt-1 text-sm font-semibold text-navy">{item.size}</p>
                              </div>
                            )}

                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{t.day}</p>
                              <p className="mt-1 text-sm font-semibold text-navy">{item.days}</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-display text-xl font-extrabold text-ice">{formatPrice(item.subtotal)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatPrice(item.equipment.price_per_day)} / {t.day}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <span className="font-display text-lg font-bold text-navy">{t.total}</span>
                  <span className="font-display text-2xl font-extrabold text-ice">{formatPrice(totalPrice)}</span>
                </div>

                {!canCheckout && (
                  <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {t.selectDates}
                  </p>
                )}

                <Link
                  href={`/${l}/checkout`}
                  className={canCheckout ? "btn-primary mt-5 flex w-full justify-center !py-4" : "mt-5 flex w-full cursor-not-allowed justify-center rounded-2xl bg-slate-200 px-5 py-4 text-sm font-bold text-slate-400"}
                  aria-disabled={!canCheckout}
                  onClick={(e) => {
                    if (!canCheckout) e.preventDefault();
                  }}
                >
                  {t.checkout}
                </Link>
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
