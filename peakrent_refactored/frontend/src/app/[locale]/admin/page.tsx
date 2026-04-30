"use client";
/**
 * src/app/[locale]/admin/page.tsx
 * ================================
 * Страница администратора с редактированием товаров.
 *
 * Вкладки:
 *   📦 Снаряжение  — список + добавить + редактировать + удалить
 *   📅 Бронирования — список + изменить статус
 *   👥 Пользователи — список
 */

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const LOCALES = [
  { code: "ru", label: "РУС" },
  { code: "kk", label: "ҚАЗ" },
  { code: "en", label: "ENG" },
] as const;

// ── Типы данных ────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name_ru: string;
  description_ru: string;
  price_per_day: number;
  image_url: string;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
}
interface Booking {
  id: number;
  status: string;
  total_price: number;
  user: { name: string; phone: string } | null;
  items: { equipment_name: string }[];
  start_date: string;
  end_date: string;
}
interface User {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  role: string;
}
interface AnalyticsSummary {
  date_from: string;
  date_to: string;
  total_revenue: number;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  avg_booking_value: number;
  active_users: number;
}
interface TopProduct {
  equipment_id: number;
  name: string;
  rental_count: number;
  revenue: number;
}
interface TopUser {
  user_id: number;
  name: string;
  phone: string;
  booking_count: number;
  total_spent: number;
}

// Пустая форма для добавления нового товара
const EMPTY_FORM = {
  name: "", description: "", price: "", stock: "1", image_url: "",
};

const MESSAGES = {
  ru: {
    title: "🏔 PeakRent — Администратор",
    logout: "Выйти",
    loading: "Загружаем...",
    tabs: {
      products: "📦 Снаряжение",
      bookings: "📅 Бронирования",
      users: "👥 Пользователи",
      analytics: "📊 Аналитика",
    },
    errors: {
      connection: "Ошибка соединения. Бэкенд запущен на порту 5000?",
      analytics: "Не удалось загрузить аналитику",
      export: "Не удалось экспортировать отчет",
      upload: "Ошибка загрузки файла",
      generic: "Ошибка",
      delete: "Ошибка при удалении",
    },
    alerts: {
      addRequired: "Заполните название и цену",
      editRequired: "Название и цена не могут быть пустыми",
      connection: "Ошибка соединения",
      deleteConfirm: (name: string) => `Скрыть "${name}" из каталога?`,
    },
    products: {
      addTitle: "➕ Добавить снаряжение",
      fields: {
        name: "Название *",
        price: "Цена ₸/день *",
        stock: "Остаток (шт.)",
        description: "Описание",
        imageUrl: "URL фотографии",
      },
      placeholders: {
        name: "Горнолыжный шлем",
        price: "5000",
        stock: "10",
        description: "Краткое описание",
        imageUrl: "https://... или /uploads/products/...",
      },
      uploadHint: "Можно выбрать файл с ноутбука",
      uploading: "Загружаем файл...",
      add: "Добавить",
      adding: "Добавляем...",
      empty: "Снаряжения нет. Добавьте первое ↑",
      columns: {
        image: "Фото",
        name: "Название",
        description: "Описание",
        price: "Цена/день",
        stock: "Остаток",
        featured: "Featured",
        actions: "Действия",
      },
      noImage: "нет",
      featuredHome: "Главная",
      featuredTop: "★ Топ",
      save: "Сохранить",
      cancel: "Отмена",
      edit: "Изменить",
      delete: "Удалить",
      pieces: "шт.",
    },
    bookings: {
      columns: {
        client: "Клиент",
        equipment: "Снаряжение",
        period: "Период",
        amount: "Сумма",
        status: "Статус",
        update: "Изменить",
      },
      empty: "Бронирований нет",
    },
    users: {
      columns: {
        name: "Имя",
        phone: "Телефон",
        email: "Email",
        role: "Роль",
      },
      empty: "Нет пользователей",
      roles: {
        admin: "Администратор",
        manager: "Менеджер",
        user: "Клиент",
      },
    },
    analytics: {
      title: "Аналитика аренды",
      subtitle: "Доход, экспорт CSV и самые востребованные позиции",
      from: "С",
      to: "По",
      revenue: "Доход",
      bookings: "Всего броней",
      average: "Средний чек",
      activeUsers: "Активные клиенты",
      exporting: "Экспорт...",
      export: {
        summary: "CSV: Сводка",
        products: "CSV: Топ товаров",
        users: "CSV: Топ клиентов",
      },
      topProducts: "Топ товары",
      topUsers: "Топ клиенты",
      product: "Товар",
      rentals: "Аренд",
      income: "Доход",
      client: "Клиент",
      booking: "Бронь",
      loading: "Загрузка...",
      empty: "Данных пока нет",
    },
    status: {
      pending: "В ожидании",
      confirmed: "Подтверждено",
      completed: "Завершено",
      cancelled: "Отменено",
    },
  },
  kk: {
    title: "🏔 PeakRent — Әкімші",
    logout: "Шығу",
    loading: "Жүктелуде...",
    tabs: {
      products: "📦 Жабдықтар",
      bookings: "📅 Броньдар",
      users: "👥 Пайдаланушылар",
      analytics: "📊 Аналитика",
    },
    errors: {
      connection: "Қосылым қатесі. Backend 5000 портында іске қосылған ба?",
      analytics: "Аналитиканы жүктеу мүмкін болмады",
      export: "Есепті экспорттау мүмкін болмады",
      upload: "Файлды жүктеу қатесі",
      generic: "Қате",
      delete: "Жою кезінде қате шықты",
    },
    alerts: {
      addRequired: "Атауы мен бағасын толтырыңыз",
      editRequired: "Атауы мен бағасы бос болмауы керек",
      connection: "Қосылым қатесі",
      deleteConfirm: (name: string) => `"${name}" тауарын каталогтан жасырайық па?`,
    },
    products: {
      addTitle: "➕ Жабдық қосу",
      fields: {
        name: "Атауы *",
        price: "Бағасы ₸/күн *",
        stock: "Қалдық (дана)",
        description: "Сипаттама",
        imageUrl: "Фото URL",
      },
      placeholders: {
        name: "Тау шаңғысы дулығасы",
        price: "5000",
        stock: "10",
        description: "Қысқаша сипаттама",
        imageUrl: "https://... немесе /uploads/products/...",
      },
      uploadHint: "Ноутбуктан файл таңдауға болады",
      uploading: "Файл жүктелуде...",
      add: "Қосу",
      adding: "Қосылуда...",
      empty: "Жабдық жоқ. Алғашқысын қосыңыз ↑",
      columns: {
        image: "Фото",
        name: "Атауы",
        description: "Сипаттама",
        price: "Бағасы/күн",
        stock: "Қалдық",
        featured: "Басты бет",
        actions: "Әрекеттер",
      },
      noImage: "жоқ",
      featuredHome: "Басты",
      featuredTop: "★ Үздік",
      save: "Сақтау",
      cancel: "Бас тарту",
      edit: "Өзгерту",
      delete: "Жою",
      pieces: "дана",
    },
    bookings: {
      columns: {
        client: "Клиент",
        equipment: "Жабдық",
        period: "Кезең",
        amount: "Сома",
        status: "Күйі",
        update: "Өзгерту",
      },
      empty: "Броньдар жоқ",
    },
    users: {
      columns: {
        name: "Аты",
        phone: "Телефон",
        email: "Email",
        role: "Рөлі",
      },
      empty: "Пайдаланушылар жоқ",
      roles: {
        admin: "Әкімші",
        manager: "Менеджер",
        user: "Клиент",
      },
    },
    analytics: {
      title: "Жалдау аналитикасы",
      subtitle: "Табыс, CSV экспорт және ең өтімді позициялар",
      from: "Басы",
      to: "Соңы",
      revenue: "Табыс",
      bookings: "Барлық бронь",
      average: "Орташа чек",
      activeUsers: "Белсенді клиент",
      exporting: "Экспорт...",
      export: {
        summary: "CSV: Қысқаша есеп",
        products: "CSV: Топ тауарлар",
        users: "CSV: Топ клиенттер",
      },
      topProducts: "Топ тауарлар",
      topUsers: "Топ клиенттер",
      product: "Тауар",
      rentals: "Жалға алу",
      income: "Табыс",
      client: "Клиент",
      booking: "Бронь",
      loading: "Жүктелуде...",
      empty: "Әзірге дерек жоқ",
    },
    status: {
      pending: "Күтілуде",
      confirmed: "Расталды",
      completed: "Аяқталды",
      cancelled: "Бас тартылды",
    },
  },
  en: {
    title: "🏔 PeakRent — Administrator",
    logout: "Log out",
    loading: "Loading...",
    tabs: {
      products: "📦 Equipment",
      bookings: "📅 Bookings",
      users: "👥 Users",
      analytics: "📊 Analytics",
    },
    errors: {
      connection: "Connection error. Is the backend running on port 5000?",
      analytics: "Failed to load analytics",
      export: "Failed to export report",
      upload: "File upload error",
      generic: "Error",
      delete: "Failed to delete",
    },
    alerts: {
      addRequired: "Please fill in the name and price",
      editRequired: "Name and price cannot be empty",
      connection: "Connection error",
      deleteConfirm: (name: string) => `Hide "${name}" from the catalog?`,
    },
    products: {
      addTitle: "➕ Add equipment",
      fields: {
        name: "Name *",
        price: "Price ₸/day *",
        stock: "Stock (pcs)",
        description: "Description",
        imageUrl: "Image URL",
      },
      placeholders: {
        name: "Ski helmet",
        price: "5000",
        stock: "10",
        description: "Short description",
        imageUrl: "https://... or /uploads/products/...",
      },
      uploadHint: "You can choose a file from your laptop",
      uploading: "Uploading file...",
      add: "Add",
      adding: "Adding...",
      empty: "No equipment yet. Add the first one ↑",
      columns: {
        image: "Image",
        name: "Name",
        description: "Description",
        price: "Price/day",
        stock: "Stock",
        featured: "Featured",
        actions: "Actions",
      },
      noImage: "none",
      featuredHome: "Home",
      featuredTop: "★ Top",
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      pieces: "pcs",
    },
    bookings: {
      columns: {
        client: "Client",
        equipment: "Equipment",
        period: "Period",
        amount: "Amount",
        status: "Status",
        update: "Update",
      },
      empty: "No bookings",
    },
    users: {
      columns: {
        name: "Name",
        phone: "Phone",
        email: "Email",
        role: "Role",
      },
      empty: "No users",
      roles: {
        admin: "Administrator",
        manager: "Manager",
        user: "Client",
      },
    },
    analytics: {
      title: "Rental analytics",
      subtitle: "Revenue, CSV export, and top-performing items",
      from: "From",
      to: "To",
      revenue: "Revenue",
      bookings: "Total bookings",
      average: "Average order",
      activeUsers: "Active clients",
      exporting: "Exporting...",
      export: {
        summary: "CSV: Summary",
        products: "CSV: Top products",
        users: "CSV: Top users",
      },
      topProducts: "Top products",
      topUsers: "Top users",
      product: "Product",
      rentals: "Rentals",
      income: "Revenue",
      client: "Client",
      booking: "Bookings",
      loading: "Loading...",
      empty: "No data yet",
    },
    status: {
      pending: "Pending",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
    },
  },
} as const;

export default function AdminPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const l = params.locale;
  const t = MESSAGES[l as keyof typeof MESSAGES] ?? MESSAGES.ru;

  // ── Состояния ──────────────────────────────────────────────────────────────
  const [tab,      setTab]      = useState<"products"|"bookings"|"users"|"analytics">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exporting, setExporting] = useState<""|"summary"|"products"|"users">("");
  const [dateFrom, setDateFrom] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  // Форма добавления товара
  const [addForm, setAddForm]   = useState(EMPTY_FORM);
  const [adding,  setAdding]    = useState(false);
  const [uploadingAddImage, setUploadingAddImage] = useState(false);

  // Какой товар сейчас редактируется (null = никакой)
  // editData хранит текущие значения полей редактируемой строки
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    name: string; description: string; price: string;
    stock: string; image_url: string; is_featured: boolean;
  }>({ name: "", description: "", price: "", stock: "", image_url: "", is_featured: false });
  const [saving, setSaving] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

  // ── Вспомогательные ───────────────────────────────────────────────────────
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("pr_token") : null;

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });
  const analyticsQuery = () => `date_from=${dateFrom}&date_to=${dateTo}&locale=${l}`;

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/admin/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || t.errors.upload);
    return data.image_url as string;
  }

  // ── Загрузка данных при входе на страницу ─────────────────────────────────
  useEffect(() => {
    if (!getToken()) { router.push(`/${l}/auth`); return; }
    loadAll();
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    loadAnalytics();
  }, [dateFrom, dateTo]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [pRes, bRes, uRes] = await Promise.all([
        fetch(`${API}/admin/products`, { headers: headers() }),
        fetch(`${API}/admin/bookings`, { headers: headers() }),
        fetch(`${API}/admin/users`,    { headers: headers() }),
      ]);
      if (pRes.status === 401 || pRes.status === 403) {
        router.push(`/${l}/auth`);
        return;
      }
      setProducts(await pRes.json());
      setBookings(await bRes.json());
      setUsers(await uRes.json());
      await loadAnalytics();
    } catch {
      setError(t.errors.connection);
    } finally {
      setLoading(false);
    }
  }

  // ── Добавить товар ─────────────────────────────────────────────────────────
  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const [summaryRes, productsRes, usersRes] = await Promise.all([
        fetch(`${API}/admin/analytics/summary?${analyticsQuery()}`, { headers: headers() }),
        fetch(`${API}/admin/analytics/top-products?${analyticsQuery()}`, { headers: headers() }),
        fetch(`${API}/admin/analytics/top-users?${analyticsQuery()}`, { headers: headers() }),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (productsRes.ok) setTopProducts(await productsRes.json());
      if (usersRes.ok) setTopUsers(await usersRes.json());
    } catch {
      setError(t.errors.analytics);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function exportAnalytics(type: "summary" | "products" | "users") {
    setExporting(type);
    try {
      const res = await fetch(`${API}/admin/analytics/export?type=${type}&${analyticsQuery()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        alert(t.errors.export);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename=\"(.+)\"/)?.[1] ?? `analytics-${type}.csv`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting("");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name || !addForm.price) {
      alert(t.alerts.addRequired);
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`${API}/admin/products`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name:        addForm.name,
          description: addForm.description,
          price:       parseFloat(addForm.price),
          stock:       parseInt(addForm.stock) || 1,
          image_url:   addForm.image_url,
        }),
      });
      if (!res.ok) { alert((await res.json()).error || t.errors.generic); return; }
      const created = await res.json();
      setProducts(prev => [created, ...prev]); // новый товар в начало списка
      setAddForm(EMPTY_FORM);
    } catch { alert(t.alerts.connection); }
    finally { setAdding(false); }
  }

  // ── Начать редактирование строки ───────────────────────────────────────────
  function startEdit(p: Product) {
    setEditId(p.id);
    setEditData({
      name:        p.name_ru,
      description: p.description_ru,
      price:       String(p.price_per_day),
      stock:       String(p.stock),
      image_url:   p.image_url,
      is_featured: p.is_featured,
    });
  }

  // ── Отменить редактирование ────────────────────────────────────────────────
  function cancelEdit() {
    setEditId(null);
  }

  // ── Сохранить изменения ────────────────────────────────────────────────────
  async function saveEdit(id: number) {
    if (!editData.name || !editData.price) {
      alert(t.alerts.editRequired);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/products/${id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          name:        editData.name,
          description: editData.description,
          price:       parseFloat(editData.price),
          stock:       parseInt(editData.stock) || 0,
          image_url:   editData.image_url,
          is_featured: editData.is_featured,
        }),
      });
      if (!res.ok) { alert((await res.json()).error || t.errors.generic); return; }
      const updated = await res.json();
      // Заменяем старый объект в списке на обновлённый
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      setEditId(null); // закрываем режим редактирования
    } catch { alert(t.alerts.connection); }
    finally { setSaving(false); }
  }

  // ── Удалить (скрыть) товар ─────────────────────────────────────────────────
  async function handleDelete(id: number, name: string) {
    if (!confirm(t.alerts.deleteConfirm(name))) return;
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
    else alert(t.errors.delete);
  }

  // ── Изменить статус бронирования ───────────────────────────────────────────
  async function changeBookingStatus(id: number, status: string) {
    const res = await fetch(`${API}/admin/bookings/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
    }
  }

  // ── Цвет бейджа статуса ────────────────────────────────────────────────────
  const statusBadge = (s: string) => ({
    confirmed: "bg-green-100 text-green-700",
    pending:   "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-600",
    completed: "bg-gray-100 text-gray-600",
  }[s] ?? "bg-gray-100 text-gray-500");
  const statusLabel = (s: string) =>
    t.status[s as keyof typeof t.status] ?? s;
  const roleLabel = (role: string) =>
    t.users.roles[role as keyof typeof t.users.roles] ?? role;
  const switchLocale = (code: string) => {
    const parts = pathname.split("/");
    parts[1] = code;
    router.push(parts.join("/") || `/${code}`);
  };

  // ── Рендер ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Шапка */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">{t.title}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            {LOCALES.map((localeOption) => (
              <button
                key={localeOption.code}
                onClick={() => switchLocale(localeOption.code)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                  l === localeOption.code
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-white hover:text-gray-800"
                }`}
              >
                {localeOption.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { localStorage.removeItem("pr_token"); router.push(`/${l}/auth`); }}
            className="text-sm text-red-500 hover:underline"
          >
            {t.logout}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Вкладки */}
        <div className="flex gap-1 border-b">
          {(["products","bookings","users"] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === tabKey
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.tabs[tabKey]}
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {{ products:products.length, bookings:bookings.length, users:users.length }[tabKey]}
              </span>
            </button>
          ))}
          <button
            onClick={() => setTab("analytics")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === "analytics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.tabs.analytics}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {topProducts.length + topUsers.length}
            </span>
          </button>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">{t.loading}</div>
        ) : (
          <>

            {/* ════════════════════════════════════════
                ВКЛАДКА: СНАРЯЖЕНИЕ
            ════════════════════════════════════════ */}
            {tab === "products" && (
              <div className="space-y-5">

                {/* Форма добавления нового товара */}
                <div className="bg-white rounded-xl border p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">{t.products.addTitle}</h2>
                  <form onSubmit={handleAdd}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                    <Field label={t.products.fields.name}>
                      <input value={addForm.name}
                        onChange={e => setAddForm({...addForm, name: e.target.value})}
                        placeholder={t.products.placeholders.name} className={input} />
                    </Field>

                    <Field label={t.products.fields.price}>
                      <input type="number" value={addForm.price}
                        onChange={e => setAddForm({...addForm, price: e.target.value})}
                        placeholder={t.products.placeholders.price} className={input} />
                    </Field>

                    <Field label={t.products.fields.stock}>
                      <input type="number" value={addForm.stock}
                        onChange={e => setAddForm({...addForm, stock: e.target.value})}
                        placeholder={t.products.placeholders.stock} className={input} />
                    </Field>

                    <Field label={t.products.fields.description}>
                      <input value={addForm.description}
                        onChange={e => setAddForm({...addForm, description: e.target.value})}
                        placeholder={t.products.placeholders.description} className={input} />
                    </Field>

                    <Field label={t.products.fields.imageUrl}>
                      <div className="space-y-2">
                        <input type="url" value={addForm.image_url}
                          onChange={e => setAddForm({...addForm, image_url: e.target.value})}
                          placeholder={t.products.placeholders.imageUrl} className={input} />
                        <input
                          type="file"
                          accept="image/*"
                          className={input}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingAddImage(true);
                            try {
                              const imageUrl = await uploadImage(file);
                              setAddForm((prev) => ({ ...prev, image_url: imageUrl }));
                            } catch (err: any) {
                              alert(err?.message || t.errors.upload);
                            } finally {
                              setUploadingAddImage(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <p className="text-xs text-gray-400">
                          {uploadingAddImage ? t.products.uploading : t.products.uploadHint}
                        </p>
                      </div>
                    </Field>

                    <div className="flex items-end">
                      <button type="submit" disabled={adding}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                        {adding ? t.products.adding : t.products.add}
                      </button>
                    </div>

                  </form>
                </div>

                {/* Таблица снаряжения */}
                <div className="bg-white rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-3 text-left w-14">{t.products.columns.image}</th>
                        <th className="px-3 py-3 text-left">{t.products.columns.name}</th>
                        <th className="px-3 py-3 text-left">{t.products.columns.description}</th>
                        <th className="px-3 py-3 text-left w-28">{t.products.columns.price}</th>
                        <th className="px-3 py-3 text-left w-24">{t.products.columns.stock}</th>
                        <th className="px-3 py-3 text-left w-20">{t.products.columns.featured}</th>
                        <th className="px-3 py-3 text-left w-36">{t.products.columns.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            {t.products.empty}
                          </td>
                        </tr>
                      )}

                      {products.map(p => {
                        const isEditing = editId === p.id;

                        return (
                          <tr key={p.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              !p.is_active ? "opacity-40" : ""
                            } ${isEditing ? "bg-blue-50" : ""}`}>

                            {/* ── Фото ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                // В режиме редактирования показываем превью
                                editData.image_url
                                  ? <img src={editData.image_url} alt=""
                                      className="w-12 h-10 object-cover rounded-lg border" />
                                  : <div className="w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">{t.products.noImage}</div>
                              ) : (
                                p.image_url
                                  ? <img src={p.image_url} alt={p.name_ru}
                                      className="w-12 h-10 object-cover rounded-lg" />
                                  : <div className="w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">—</div>
                              )}
                            </td>

                            {/* ── Название ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <div className="space-y-1">
                                  <input value={editData.name}
                                    onChange={e => setEditData({...editData, name: e.target.value})}
                                    className={inputSm + " w-full"} placeholder={t.products.fields.name} />
                                  {/* URL фото — в строке названия для удобства */}
                                  <input value={editData.image_url}
                                    onChange={e => setEditData({...editData, image_url: e.target.value})}
                                    className={inputSm + " w-full"} placeholder={t.products.fields.imageUrl} />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className={inputSm + " w-full"}
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingEditImage(true);
                                      try {
                                        const imageUrl = await uploadImage(file);
                                        setEditData((prev) => ({ ...prev, image_url: imageUrl }));
                                      } catch (err: any) {
                                        alert(err?.message || t.errors.upload);
                                      } finally {
                                        setUploadingEditImage(false);
                                        e.target.value = "";
                                      }
                                    }}
                                  />
                                  {uploadingEditImage && (
                                    <p className="text-[11px] text-gray-400">{t.products.uploading}</p>
                                  )}
                                </div>
                              ) : (
                                <span className="font-medium text-gray-800">{p.name_ru}</span>
                              )}
                            </td>

                            {/* ── Описание ── */}
                            <td className="px-3 py-3 max-w-[200px]">
                              {isEditing ? (
                                <input value={editData.description}
                                  onChange={e => setEditData({...editData, description: e.target.value})}
                                  className={inputSm + " w-full"} placeholder={t.products.fields.description} />
                              ) : (
                                <span className="text-gray-500 text-xs line-clamp-2">
                                  {p.description_ru || "—"}
                                </span>
                              )}
                            </td>

                            {/* ── Цена ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <input type="number" value={editData.price}
                                  onChange={e => setEditData({...editData, price: e.target.value})}
                                  className={inputSm + " w-24"} />
                              ) : (
                                <span className="font-semibold text-blue-600">
                                  {p.price_per_day.toLocaleString()} ₸
                                </span>
                              )}
                            </td>

                            {/* ── Остаток ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <input type="number" value={editData.stock}
                                  onChange={e => setEditData({...editData, stock: e.target.value})}
                                  className={inputSm + " w-16"} />
                              ) : (
                                <span className={`font-medium ${
                                  p.stock === 0 ? "text-red-500" :
                                  p.stock <= 2 ? "text-amber-600" : "text-gray-700"
                                }`}>{p.stock} {t.products.pieces}</span>
                              )}
                            </td>

                            {/* ── Featured ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={editData.is_featured}
                                    onChange={e => setEditData({...editData, is_featured: e.target.checked})}
                                    className="w-4 h-4 rounded" />
                                  <span className="text-xs text-gray-600">{t.products.featuredHome}</span>
                                </label>
                              ) : (
                                p.is_featured
                                  ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{t.products.featuredTop}</span>
                                  : <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>

                            {/* ── Кнопки действий ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                // Режим редактирования: Сохранить / Отмена
                                <div className="flex gap-1">
                                  <button onClick={() => saveEdit(p.id)} disabled={saving}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors">
                                    {saving ? "..." : t.products.save}
                                  </button>
                                  <button onClick={cancelEdit}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    {t.products.cancel}
                                  </button>
                                </div>
                              ) : (
                                // Обычный режим: Изменить / Удалить
                                <div className="flex gap-1">
                                  <button onClick={() => startEdit(p)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    {t.products.edit}
                                  </button>
                                  <button onClick={() => handleDelete(p.id, p.name_ru)}
                                    className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    {t.products.delete}
                                  </button>
                                </div>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {/* ════════════════════════════════════════
                ВКЛАДКА: БРОНИРОВАНИЯ
            ════════════════════════════════════════ */}
            {tab === "bookings" && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.client}</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.equipment}</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.period}</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.amount}</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.status}</th>
                      <th className="px-4 py-3 text-left">{t.bookings.columns.update}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">{t.bookings.empty}</td></tr>
                    )}
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-400 text-xs">#{b.id}</td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700 font-medium">{b.user?.name || "—"}</p>
                          <p className="text-gray-400 text-xs">{b.user?.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                          {b.items?.[0]?.equipment_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {b.start_date} → {b.end_date}
                        </td>
                        <td className="px-4 py-3 font-semibold text-blue-600">
                          {b.total_price?.toLocaleString()} ₸
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(b.status)}`}>
                            {statusLabel(b.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select value={b.status}
                            onChange={e => changeBookingStatus(b.id, e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="pending">{t.status.pending}</option>
                            <option value="confirmed">{t.status.confirmed}</option>
                            <option value="completed">{t.status.completed}</option>
                            <option value="cancelled">{t.status.cancelled}</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}


            {/* ════════════════════════════════════════
                ВКЛАДКА: ПОЛЬЗОВАТЕЛИ
            ════════════════════════════════════════ */}
            {tab === "users" && (
              <div className="bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">{t.users.columns.name}</th>
                      <th className="px-4 py-3 text-left">{t.users.columns.phone}</th>
                      <th className="px-4 py-3 text-left">{t.users.columns.email}</th>
                      <th className="px-4 py-3 text-left">{t.users.columns.role}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">{t.users.empty}</td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-400 text-xs">{u.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-700">{u.name || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{u.phone || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">{u.email || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {roleLabel(u.role)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "analytics" && (
              <div className="space-y-5">
                <div className="bg-white rounded-xl border p-5">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-gray-800">{t.analytics.title}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {t.analytics.subtitle}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.analytics.from}</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputSm + " w-full"} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t.analytics.to}</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputSm + " w-full"} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border p-5">
                    <p className="text-sm text-gray-500">{t.analytics.revenue}</p>
                    <p className="text-2xl font-bold mt-2 text-green-600">{summary?.total_revenue?.toLocaleString() ?? 0} ₸</p>
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <p className="text-sm text-gray-500">{t.analytics.bookings}</p>
                    <p className="text-2xl font-bold mt-2 text-blue-600">{summary?.total_bookings ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <p className="text-sm text-gray-500">{t.analytics.average}</p>
                    <p className="text-2xl font-bold mt-2 text-purple-600">{Math.round(summary?.avg_booking_value ?? 0).toLocaleString()} ₸</p>
                  </div>
                  <div className="bg-white rounded-xl border p-5">
                    <p className="text-sm text-gray-500">{t.analytics.activeUsers}</p>
                    <p className="text-2xl font-bold mt-2 text-amber-600">{summary?.active_users ?? 0}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["summary", "products", "users"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => exportAnalytics(type)}
                      disabled={exporting !== ""}
                      className="bg-white border rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
                    >
                      {exporting === type
                        ? t.analytics.exporting
                        : type === "summary"
                        ? t.analytics.export.summary
                        : type === "products"
                        ? t.analytics.export.products
                        : t.analytics.export.users}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <div className="bg-white rounded-xl border overflow-x-auto">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700">{t.analytics.topProducts}</h3>
                      {analyticsLoading && <span className="text-xs text-gray-400">{t.analytics.loading}</span>}
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">{t.analytics.product}</th>
                          <th className="px-4 py-3 text-left">{t.analytics.rentals}</th>
                          <th className="px-4 py-3 text-left">{t.analytics.income}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {topProducts.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">{t.analytics.empty}</td></tr>
                        ) : topProducts.map(item => (
                          <tr key={item.equipment_id}>
                            <td className="px-4 py-3 font-medium text-gray-700">{item.name}</td>
                            <td className="px-4 py-3 text-gray-600">{item.rental_count}</td>
                            <td className="px-4 py-3 font-semibold text-blue-600">{item.revenue.toLocaleString()} ₸</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-white rounded-xl border overflow-x-auto">
                    <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-700">{t.analytics.topUsers}</h3>
                      {summary && <span className="text-xs text-gray-400">{summary.date_from} → {summary.date_to}</span>}
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">{t.analytics.client}</th>
                          <th className="px-4 py-3 text-left">{t.analytics.booking}</th>
                          <th className="px-4 py-3 text-left">{t.analytics.income}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {topUsers.length === 0 ? (
                          <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-400">{t.analytics.empty}</td></tr>
                        ) : topUsers.map(item => (
                          <tr key={item.user_id}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-700">{item.name || "—"}</p>
                              <p className="text-xs text-gray-400">{item.phone || "—"}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{item.booking_count}</td>
                            <td className="px-4 py-3 font-semibold text-blue-600">{item.total_spent.toLocaleString()} ₸</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}

// ── Вспомогательные компоненты ──────────────────────────────────────────────

// Обёртка для поля формы с подписью
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// CSS классы для полей ввода (чтобы не повторять)
const input   = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
const inputSm = "border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400";
