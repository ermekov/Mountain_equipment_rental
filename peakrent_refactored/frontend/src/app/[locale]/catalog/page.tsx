"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useFeatured, useCategories } from "@/lib/hooks";
import { equipmentAPI } from "@/lib/api/client";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale, Equipment, Category } from "@/lib/types";
import { useEffect } from "react";

export default function CatalogPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { category?: string; search?: string };
}) {
  const l = params.locale as Locale;
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState(searchParams.search ?? "");
  const [category,  setCategory]  = useState(searchParams.category ?? "");
  const [sort,      setSort]      = useState("default");
  const [maxPrice,  setMaxPrice]  = useState(50000);

  const { data: categories = [] } = useCategories();

  useEffect(() => {
    setLoading(true);
    equipmentAPI.list({ limit: 80 })
      .then((r) => setEquipment(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let items = equipment;
    if (search)
      items = items.filter((e) =>
        [e.name_ru, e.name_kk, e.name_en].some((n) =>
          n.toLowerCase().includes(search.toLowerCase())
        )
      );
    if (category)
      items = items.filter((e) => e.category?.slug === category);
    items = items.filter((e) => e.price_per_day <= maxPrice);
    if (sort === "price_asc")  items = [...items].sort((a, b) => a.price_per_day - b.price_per_day);
    if (sort === "price_desc") items = [...items].sort((a, b) => b.price_per_day - a.price_per_day);
    if (sort === "rating")     items = [...items].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    return items;
  }, [equipment, search, category, maxPrice, sort]);

  const catName = (c: Category) => l === "kk" ? c.name_kk : l === "en" ? c.name_en : c.name_ru;
  const eqName  = (e: Equipment) => l === "kk" ? e.name_kk : l === "en" ? e.name_en : e.name_ru;

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-screen bg-surface">
        {/* Шапка страницы */}
        <div className="bg-white border-b border-slate-100 py-5">
          <div className="container-page">
            <h1 className="font-display text-2xl font-extrabold text-navy">
              {l === "ru" ? "Каталог снаряжения" : l === "kk" ? "Жабдықтар каталогы" : "Equipment Catalog"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {filtered.length} {l === "ru" ? "позиций доступно" : l === "kk" ? "жабдық қолжетімді" : "items available"}
            </p>
          </div>
        </div>

        <div className="container-page py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* ── Фильтры ── */}
            <aside className="bg-white rounded-2xl border border-slate-200 p-5 h-fit lg:sticky lg:top-20">
              <h2 className="font-display font-bold text-navy mb-4 flex items-center gap-2 text-sm">
                <SlidersHorizontal className="w-4 h-4" />
                {l === "ru" ? "Фильтры" : l === "kk" ? "Сүзгілер" : "Filters"}
              </h2>

              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {l === "ru" ? "Активность" : l === "kk" ? "Белсенділік" : "Activity"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategory("")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                      !category
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-slate-500 border-slate-200 hover:border-navy/40",
                    )}
                  >
                    {l === "ru" ? "Все" : l === "kk" ? "Барлығы" : "All"}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.slug === category ? "" : c.slug)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                        category === c.slug
                          ? "bg-ice text-white border-ice"
                          : "bg-white text-slate-500 border-slate-200 hover:border-ice/40",
                      )}
                    >
                      {c.icon} {catName(c)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {l === "ru" ? "Макс. цена/день" : l === "kk" ? "Күндік макс. баға" : "Max price/day"}
                </p>
                <input
                  type="range" min={1000} max={50000} step={1000}
                  value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0 ₸</span>
                  <span className="font-semibold text-navy">до {formatPrice(maxPrice)}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  {l === "ru" ? "Сортировка" : l === "kk" ? "Сұрыптау" : "Sort"}
                </p>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="input-base !py-2 text-sm"
                >
                  <option value="default">{l === "ru" ? "По умолчанию" : l === "kk" ? "Әдепкі бойынша" : "Default"}</option>
                  <option value="price_asc">{l === "ru" ? "Цена: дешевле" : l === "kk" ? "Баға: арзан" : "Price: low"}</option>
                  <option value="price_desc">{l === "ru" ? "Цена: дороже" : l === "kk" ? "Баға: қымбат" : "Price: high"}</option>
                  <option value="rating">{l === "ru" ? "По рейтингу" : l === "kk" ? "Рейтинг бойынша" : "By rating"}</option>
                </select>
              </div>
            </aside>

            {/* ── Сетка снаряжения ── */}
            <div>
              <div className="relative mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={l === "ru" ? "Поиск снаряжения..." : l === "kk" ? "Жабдық іздеу..." : "Search equipment..."}
                  className="input-base !pl-10"
                />
              </div>

              <p className="text-sm text-slate-500 mb-4">
                {l === "ru" ? `Найдено: ${filtered.length} позиций` : l === "kk" ? `Табылды: ${filtered.length} жабдық` : `Found: ${filtered.length} items`}
              </p>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 animate-pulse">
                      <div className="aspect-[4/3] bg-slate-200" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-1/3" />
                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                        <div className="h-4 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="font-medium">{l === "ru" ? "Снаряжение не найдено" : l === "kk" ? "Жабдық табылмады" : "Nothing found"}</p>
                  <p className="text-sm mt-1">{l === "ru" ? "Попробуйте изменить фильтры" : l === "kk" ? "Сүзгілерді өзгертіп көріңіз" : "Try adjusting filters"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((eq) => {
                    const n = eqName(eq);
                    return (
                      <Link
                        key={eq.id}
                        href={`/${l}/equipment/${eq.slug}`}
                        className="card-base group block"
                      >
                        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                          {eq.image_url ? (
                            <Image
                              src={eq.image_url}
                              alt={n}
                              fill
                              sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl">🎿</div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className="badge-category">
                              {eq.category?.icon} {eq.category?.name_ru}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-display font-bold text-navy text-sm mb-1 line-clamp-2">{n}</h3>
                          {eq.avg_rating && (
                            <div className="text-xs text-slate-500 mb-2">★ {eq.avg_rating} ({eq.review_count})</div>
                          )}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="price-tag text-lg">{formatPrice(eq.price_per_day)}</span>
                              <span className="text-slate-400 text-xs ml-1">/ {l === "ru" ? "день" : l === "kk" ? "күн" : "day"}</span>
                            </div>
                            <span className={cn(
                              "text-xs font-bold px-2 py-1 rounded-full",
                              eq.stock === 0
                                ? "bg-red-50 text-red-600"
                                : eq.stock <= 2
                                ? "bg-amber-50 text-amber-700"
                                : "bg-green-50 text-green-700",
                            )}>
                              {eq.stock === 0 ? "Нет" : eq.stock <= 2 ? `${eq.stock} шт.` : "Есть"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
