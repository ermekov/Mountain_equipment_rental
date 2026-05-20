"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { equipmentAPI } from "@/lib/api/client";
import { useCategories } from "@/lib/hooks";
import type { Category, Equipment, Locale } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type GenderFilter = "all" | "male" | "female";

const GENDER_FILTERS: Array<{ value: GenderFilter; icon: string }> = [
  { value: "all", icon: "◌" },
  { value: "male", icon: "♂" },
  { value: "female", icon: "♀" },
];

const HIGHLIGHT_TAGS = ["beginner-friendly", "waterproof", "thermal", "lightweight", "featured"];

export default function CatalogPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: {
    category?: string;
    search?: string;
    sort?: string;
    gender?: string;
    max_price?: string;
    in_stock?: string;
  };
}) {
  const locale = params.locale as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.search ?? "");
  const [searchInput, setSearchInput] = useState(searchParams.search ?? "");
  const [category, setCategory] = useState(searchParams.category ?? "");
  const [sort, setSort] = useState(searchParams.sort ?? "default");
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.max_price ?? 50000));
  const [gender, setGender] = useState<GenderFilter>(
    searchParams.gender === "male" || searchParams.gender === "female"
      ? searchParams.gender
      : "all"
  );
  const [onlyInStock, setOnlyInStock] = useState(searchParams.in_stock === "1");
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);

  const { data: categories = [] } = useCategories();

  useEffect(() => {
    setLoading(true);
    equipmentAPI
      .list({ limit: 100 })
      .then((response) => setEquipment(response.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    if (sort !== "default") params.set("sort", sort);
    if (gender !== "all") params.set("gender", gender);
    if (maxPrice !== 50000) params.set("max_price", String(maxPrice));
    if (onlyInStock) params.set("in_stock", "1");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [category, search, sort, gender, maxPrice, onlyInStock, pathname, router]);

  const filtered = useMemo(() => {
    let items = [...equipment];

    if (gender !== "all") {
      items = items.filter((item) => {
        const value = item.gender ?? "unisex";
        if (gender === "male") return value === "male" || value === "unisex";
        if (gender === "female") return value === "female" || value === "unisex";
        return true;
      });
    }

    if (category) {
      items = items.filter((item) => item.category?.slug === category);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter((item) =>
        [item.name_ru, item.name_kk, item.name_en, item.description_ru]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q))
      );
    }

    items = items.filter((item) => item.price_per_day <= maxPrice);

    if (onlyInStock) {
      items = items.filter((item) => item.stock > 0);
    }

    if (sort === "price_asc") {
      items.sort((a, b) => a.price_per_day - b.price_per_day);
    } else if (sort === "price_desc") {
      items.sort((a, b) => b.price_per_day - a.price_per_day);
    } else if (sort === "rating") {
      items.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    }

    return items;
  }, [equipment, gender, category, search, maxPrice, onlyInStock, sort]);

  const categoryName = (item: Category) =>
    locale === "kk" ? item.name_kk : locale === "en" ? item.name_en : item.name_ru;

  const equipmentName = (item: Equipment) =>
    locale === "kk" ? item.name_kk : locale === "en" ? item.name_en : item.name_ru;

  const dictionary = {
    title:
      locale === "kk"
        ? "Жабдықтар каталогы"
        : locale === "en"
        ? "Equipment Catalog"
        : "Каталог снаряжения",
    subtitle:
      locale === "kk"
        ? "Шаңғы, сноуборд, хайкинг және тауға арналған жалға беру позицияларын бір экраннан таңдаңыз."
        : locale === "en"
        ? "Browse ski, snowboard, hiking, and mountain rental gear in one place."
        : "Подберите лыжи, сноуборд, хайкинг и горное снаряжение для аренды в одном каталоге.",
    available:
      locale === "kk"
        ? "қолжетімді позиция"
        : locale === "en"
        ? "items available"
        : "позиций доступно",
    filters: locale === "kk" ? "Сүзгілер" : locale === "en" ? "Filters" : "Фильтры",
    activity: locale === "kk" ? "Белсенділік" : locale === "en" ? "Activity" : "Активность",
    all: locale === "kk" ? "Барлығы" : locale === "en" ? "All" : "Все",
    male: locale === "kk" ? "Ерлерге" : locale === "en" ? "Men" : "Мужское",
    female: locale === "kk" ? "Әйелдерге" : locale === "en" ? "Women" : "Женское",
    maxPrice:
      locale === "kk" ? "Макс. баға / күн" : locale === "en" ? "Max price / day" : "Макс. цена / день",
    upTo: locale === "kk" ? "дейін" : locale === "en" ? "up to" : "до",
    sort: locale === "kk" ? "Сұрыптау" : locale === "en" ? "Sort" : "Сортировка",
    defaultSort: locale === "kk" ? "Әдепкі" : locale === "en" ? "Default" : "По умолчанию",
    priceLow: locale === "kk" ? "Баға: арзан" : locale === "en" ? "Price: low" : "Цена: дешевле",
    priceHigh: locale === "kk" ? "Баға: қымбат" : locale === "en" ? "Price: high" : "Цена: дороже",
    byRating: locale === "kk" ? "Рейтинг бойынша" : locale === "en" ? "By rating" : "По рейтингу",
    onlyInStock:
      locale === "kk" ? "Тек қолда бар" : locale === "en" ? "Only in stock" : "Только в наличии",
    stockHint:
      locale === "kk"
        ? "Нөлден үлкен қалдық"
        : locale === "en"
        ? "Only items with stock"
        : "Только позиции с остатком",
    searchPlaceholder:
      locale === "kk"
        ? "Жабдық іздеу..."
        : locale === "en"
        ? "Search equipment..."
        : "Поиск снаряжения...",
    found: locale === "kk" ? "Табылды" : locale === "en" ? "Found" : "Найдено",
    results: locale === "kk" ? "позиция" : locale === "en" ? "items" : "позиций",
    emptyTitle:
      locale === "kk"
        ? "Жабдық табылмады"
        : locale === "en"
        ? "Nothing found"
        : "Снаряжение не найдено",
    emptyText:
      locale === "kk"
        ? "Сүзгілерді жұмсартып немесе іздеуді өзгертіп көріңіз"
        : locale === "en"
        ? "Try changing filters or search"
        : "Попробуйте изменить фильтры или поиск",
    resetAll: locale === "kk" ? "Барлығын тазалау" : locale === "en" ? "Reset all" : "Сбросить всё",
    day: locale === "kk" ? "күн" : locale === "en" ? "day" : "день",
    out: locale === "kk" ? "Жоқ" : locale === "en" ? "Out" : "Нет",
    inStock: locale === "kk" ? "Бар" : locale === "en" ? "Available" : "Есть",
    left: locale === "kk" ? "қалды" : locale === "en" ? "left" : "осталось",
    reviews: locale === "kk" ? "пікір" : locale === "en" ? "reviews" : "отзывов",
    rentNow: locale === "kk" ? "Жалға алу" : locale === "en" ? "Rent now" : "Арендовать",
    moreDetails: locale === "kk" ? "Толығырақ" : locale === "en" ? "Details" : "Подробнее",
    quickView: locale === "kk" ? "Жылдам қарау" : locale === "en" ? "Quick view" : "Быстрый просмотр",
    close: locale === "kk" ? "Жабу" : locale === "en" ? "Close" : "Закрыть",
    noImage: locale === "kk" ? "Сурет жоқ" : locale === "en" ? "No image" : "Нет фото",
    tagBeginner: locale === "kk" ? "Жаңадан бастаушыға" : locale === "en" ? "Beginner" : "Для новичков",
    tagWaterproof: locale === "kk" ? "Су өтпейді" : locale === "en" ? "Waterproof" : "Непромокаемое",
    tagThermal: locale === "kk" ? "Жылы" : locale === "en" ? "Thermal" : "Теплое",
    tagLightweight: locale === "kk" ? "Жеңіл" : locale === "en" ? "Lightweight" : "Легкое",
    tagFeatured: locale === "kk" ? "Ұсыныс" : locale === "en" ? "Featured" : "Рекомендуем",
    collection: locale === "kk" ? "PeakRent Collection" : locale === "en" ? "PeakRent Collection" : "PeakRent Collection",
    quickLabel: locale === "kk" ? "Жылдам сүзу" : locale === "en" ? "Quick filter" : "Быстрый фильтр",
    curated: locale === "kk" ? "Таңдалған жабдық" : locale === "en" ? "Curated gear" : "Подобранное снаряжение",
    sizes: locale === "kk" ? "Өлшемдер" : locale === "en" ? "Sizes" : "Размеры",
    availableNow: locale === "kk" ? "Қазір қолжетімді" : locale === "en" ? "Available now" : "Доступно сейчас",
  };

  const selectedCategory = category ? categories.find((item) => item.slug === category) : null;

  const activeFilters = [
    gender !== "all"
      ? {
          key: "gender",
          label: gender === "male" ? `♂ ${dictionary.male}` : `♀ ${dictionary.female}`,
          onClear: () => setGender("all"),
        }
      : null,
    selectedCategory
      ? {
          key: "category",
          label: `${selectedCategory.icon} ${categoryName(selectedCategory)}`,
          onClear: () => setCategory(""),
        }
      : null,
    search
      ? {
          key: "search",
          label: `"${search}"`,
          onClear: () => {
            setSearch("");
            setSearchInput("");
          },
        }
      : null,
    maxPrice !== 50000
      ? {
          key: "price",
          label: `${dictionary.upTo} ${formatPrice(maxPrice)}`,
          onClear: () => setMaxPrice(50000),
        }
      : null,
    onlyInStock
      ? {
          key: "stock",
          label: dictionary.onlyInStock,
          onClear: () => setOnlyInStock(false),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onClear: () => void }>;

  const getHighlightLabel = (tag: string) => {
    if (tag === "beginner-friendly") return dictionary.tagBeginner;
    if (tag === "waterproof") return dictionary.tagWaterproof;
    if (tag === "thermal") return dictionary.tagThermal;
    if (tag === "lightweight") return dictionary.tagLightweight;
    return dictionary.tagFeatured;
  };

  const getGenderBadge = (item: Equipment) => {
    if (item.gender === "male") {
      return {
        label: dictionary.male,
        className: "bg-blue-100 text-blue-700 ring-1 ring-blue-200/80",
        icon: "♂",
      };
    }
    if (item.gender === "female") {
      return {
        label: dictionary.female,
        className: "bg-pink-100 text-pink-700 ring-1 ring-pink-200/80",
        icon: "♀",
      };
    }
    return null;
  };

  const clearAll = () => {
    setGender("all");
    setCategory("");
    setSearch("");
    setSearchInput("");
    setSort("default");
    setMaxPrice(50000);
    setOnlyInStock(false);
  };

  const selectedName = selectedItem ? equipmentName(selectedItem) : "";
  const selectedDescription = selectedItem
    ? locale === "kk"
      ? selectedItem.description_kk
      : locale === "en"
      ? selectedItem.description_en
      : selectedItem.description_ru
    : "";
  const selectedCategoryName = selectedItem?.category
    ? categoryName(selectedItem.category)
    : "";

  return (
    <>
      <Navbar locale={locale} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_42%,#f8fafc_100%)]">
        <section className="border-b border-slate-200/70 bg-navy text-white">
          <div className="container-page relative overflow-hidden py-12 sm:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
            <div className="relative">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-ice-pale">
                  <Sparkles className="h-3.5 w-3.5" />
                  {dictionary.collection}
                </div>
                <h1 className="font-display text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {dictionary.title}
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  {dictionary.subtitle}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {GENDER_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setGender(filter.value)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
                        gender === filter.value
                          ? "border-ice bg-ice text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]"
                          : "border-white/15 bg-white/6 text-white/80 hover:border-white/35 hover:bg-white/10"
                      )}
                    >
                      <span className="text-base">{filter.icon}</span>
                      {filter.value === "all"
                        ? dictionary.all
                        : filter.value === "male"
                        ? dictionary.male
                        : dictionary.female}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container-page py-6 sm:py-8">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-[0_35px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={dictionary.searchPlaceholder}
                  className="input-base h-12 rounded-2xl border-slate-200 bg-slate-50/80 !pl-11 text-sm shadow-none focus:border-ice focus:bg-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {dictionary.found}
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-navy">
                      {filtered.length} {dictionary.results}
                    </div>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-ice" />
                </div>

                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="input-base h-12 rounded-2xl border-slate-200 bg-slate-50/80 text-sm shadow-none focus:border-ice focus:bg-white"
                >
                  <option value="default">{dictionary.defaultSort}</option>
                  <option value="price_asc">{dictionary.priceLow}</option>
                  <option value="price_desc">{dictionary.priceHigh}</option>
                  <option value="rating">{dictionary.byRating}</option>
                </select>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={filter.onClear}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ice-pale px-3 py-1.5 text-xs font-semibold text-ice-dark transition hover:bg-sky-100"
                  >
                    {filter.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-semibold text-slate-500 transition-colors hover:text-navy"
                >
                  {dictionary.resetAll}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="container-page pb-10 sm:pb-14">
          <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
            <aside className="h-fit rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_25px_60px_rgba(15,23,42,0.06)] xl:sticky xl:top-24">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-navy">
                <SlidersHorizontal className="h-4 w-4 text-ice" />
                {dictionary.filters}
              </div>

              <div className="mb-6">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {dictionary.quickLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCategory(item.slug === category ? "" : item.slug)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                        category === item.slug
                          ? "border-ice bg-ice text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)]"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                      )}
                    >
                      {item.icon} {categoryName(item)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6 rounded-3xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {dictionary.maxPrice}
                  </p>
                  <span className="text-xs font-semibold text-navy">
                    {dictionary.upTo} {formatPrice(maxPrice)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(Number(event.target.value))}
                  className="w-full accent-sky-500"
                />
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>0 ₸</span>
                  <span>50 000 ₸</span>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4">
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-navy">{dictionary.onlyInStock}</p>
                    <p className="mt-1 text-xs text-slate-500">{dictionary.stockHint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyInStock((value) => !value)}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                      onlyInStock ? "bg-ice" : "bg-slate-200"
                    )}
                    aria-pressed={onlyInStock}
                  >
                    <span
                      className={cn(
                        "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                        onlyInStock ? "left-6" : "left-1"
                      )}
                    />
                  </button>
                </label>
              </div>
            </aside>

            <div>
              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.06)]"
                    >
                      <div className="aspect-[4/3] animate-pulse bg-slate-200" />
                      <div className="space-y-3 p-5">
                        <div className="h-3 w-1/3 rounded bg-slate-200" />
                        <div className="h-5 w-3/4 rounded bg-slate-200" />
                        <div className="h-4 w-1/2 rounded bg-slate-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white py-24 text-center shadow-[0_25px_60px_rgba(15,23,42,0.05)]">
                  <div className="mb-5 text-5xl">🔎</div>
                  <p className="font-display text-2xl font-bold text-navy">{dictionary.emptyTitle}</p>
                  <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">{dictionary.emptyText}</p>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="mt-6 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
                  >
                    {dictionary.resetAll}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((item) => {
                    const name = equipmentName(item);
                    const genderBadge = getGenderBadge(item);
                    const highlightTags = (item.tags ?? [])
                      .filter((tag) => HIGHLIGHT_TAGS.includes(tag))
                      .slice(0, 2);

                    return (
                      <article
                        key={item.id}
                        className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white shadow-[0_25px_65px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_rgba(14,165,233,0.18)]"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={name}
                              fill
                              sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-center text-sm font-semibold text-slate-400">
                              {dictionary.noImage}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,40,0.05)_0%,rgba(10,22,40,0.65)_100%)]" />

                          <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold text-navy shadow-sm">
                                {item.category?.icon} {item.category?.name_ru}
                              </span>
                              {genderBadge && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm",
                                    genderBadge.className
                                  )}
                                >
                                  <span>{genderBadge.icon}</span>
                                  {genderBadge.label}
                                </span>
                              )}
                            </div>

                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-bold shadow-sm",
                                item.stock === 0
                                  ? "bg-red-50 text-red-600"
                                  : item.stock <= 2
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              )}
                            >
                              {item.stock === 0
                                ? dictionary.out
                                : item.stock <= 2
                                ? `${dictionary.left} ${item.stock}`
                                : dictionary.inStock}
                            </span>
                          </div>

                          <div className="absolute bottom-3 left-4 right-4">
                            <div className="flex items-end justify-between gap-3">
                              <div className="flex min-h-[44px] flex-wrap items-end gap-2">
                                {highlightTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-navy"
                                  >
                                    {getHighlightLabel(tag)}
                                  </span>
                                ))}
                              </div>

                              <div className="absolute inset-x-0 bottom-0 h-14 rounded-[1.4rem] bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.18),rgba(255,255,255,0.08))] opacity-70 blur-xl" />
                              <button
                                type="button"
                                onClick={() => setSelectedItem(item)}
                                className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-[0_15px_35px_rgba(15,23,42,0.24)] transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-105"
                                aria-label={dictionary.quickView}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-lg font-bold leading-6 text-navy">{name}</h3>
                            {item.avg_rating ? (
                              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                                {item.avg_rating.toFixed(1)}
                              </div>
                            ) : null}
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                            {item.description_ru || dictionary.curated}
                          </p>

                          <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                                {dictionary.rentNow}
                              </div>
                              <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-navy">{formatPrice(item.price_per_day)}</span>
                                <span className="text-xs text-slate-400">/ {dictionary.day}</span>
                              </div>
                            </div>

                            <div className="text-right text-xs text-slate-400">
                              <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 font-semibold text-slate-500">
                                <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                                {item.review_count ?? 0} {dictionary.reviews}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-navy transition hover:border-ice hover:text-ice"
                            >
                              {dictionary.quickView}
                            </button>
                            <Link
                              href={`/${locale}/equipment/${item.slug}`}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
                            >
                              {dictionary.moreDetails}
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/55 px-4 py-4 backdrop-blur-sm sm:py-8">
          <div
            className="absolute inset-0"
            onClick={() => setSelectedItem(null)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.35)] max-h-[92vh]">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-navy"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid max-h-[92vh] gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative hidden min-h-[280px] bg-slate-100 lg:block">
                {selectedItem.image_url ? (
                  <Image
                    src={selectedItem.image_url}
                    alt={selectedName}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-sm font-semibold text-slate-400">
                    {dictionary.noImage}
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,22,40,0.04)_0%,rgba(10,22,40,0.36)_100%)]" />
                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/92 px-3 py-1 text-[11px] font-bold text-navy shadow-sm">
                    {selectedItem.category?.icon} {selectedCategoryName}
                  </span>
                  {getGenderBadge(selectedItem) && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm",
                        getGenderBadge(selectedItem)?.className
                      )}
                    >
                      <span>{getGenderBadge(selectedItem)?.icon}</span>
                      {getGenderBadge(selectedItem)?.label}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex max-h-[92vh] flex-col overflow-y-auto p-6 sm:p-8">
                <div className="relative mb-5 aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-slate-100 lg:hidden">
                  {selectedItem.image_url ? (
                    <Image
                      src={selectedItem.image_url}
                      alt={selectedName}
                      fill
                      sizes="100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
                      {dictionary.noImage}
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      PeakRent Gear
                    </p>
                    <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-navy font-display sm:text-3xl">
                      {selectedName}
                    </h3>
                  </div>
                  {selectedItem.avg_rating ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600">
                      <Star className="h-4 w-4 fill-current text-amber-400" />
                      {selectedItem.avg_rating.toFixed(1)}
                    </div>
                  ) : null}
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-600">
                  {selectedDescription || dictionary.curated}
                </p>

                {!!selectedItem.tags?.length && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedItem.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-ice-pale px-3 py-1 text-xs font-semibold text-ice-dark"
                      >
                        {HIGHLIGHT_TAGS.includes(tag) ? getHighlightLabel(tag) : tag}
                      </span>
                    ))}
                  </div>
                )}

                {!!selectedItem.sizes?.length && (
                  <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {dictionary.sizes}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedItem.sizes.slice(0, 6).map((size) => (
                        <span
                          key={size.value}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy"
                        >
                          {size.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      {dictionary.availableNow}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-navy">
                      {selectedItem.stock > 0
                        ? `${selectedItem.stock} ${dictionary.available}`
                        : dictionary.out}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-navy">{formatPrice(selectedItem.price_per_day)}</div>
                    <div className="text-xs text-slate-400">/ {dictionary.day}</div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-navy"
                  >
                    {dictionary.close}
                  </button>
                  <Link
                    href={`/${locale}/equipment/${selectedItem.slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-ice px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(14,165,233,0.24)] transition hover:bg-ice-dark"
                  >
                    {dictionary.rentNow}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
