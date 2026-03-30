"use client";
/**
 * src/app/[locale]/manager/page.tsx
 * ====================================
 * Страница менеджера — управление заказами.
 *
 * Что может менеджер:
 *   ✅ Видеть все бронирования
 *   ✅ Подтверждать / завершать / отменять заказы
 *   ✅ Искать заказы по телефону клиента
 *   ✅ Фильтровать по статусу
 *   ✅ Видеть список клиентов и снаряжения (только просмотр)
 *   ❌ НЕ может менять снаряжение (это только admin)
 *   ❌ НЕ может менять роли пользователей
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ── Типы данных ────────────────────────────────────────────────────────────
interface Booking {
  id: number;
  booking_number: string;
  status: string;
  total_price: number;
  days: number;
  payment_method: string | null;
  notes: string;
  created_at: string;
  start_date: string;
  end_date: string;
  user: { id: number; name: string; phone: string } | null;
  items: Array<{ equipment_name: string; quantity: number; size: string | null; subtotal: number }>;
}

interface Client {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  booking_count: number;
  active_bookings: number;
}

interface Product {
  id: number;
  name_ru: string;
  price_per_day: number;
  stock: number;
  is_active: boolean;
}

// Статусы и их отображение
const STATUS_CONFIG = {
  pending:   { label: "Ожидает",       color: "bg-yellow-100 text-yellow-700", next: ["confirmed", "cancelled"] },
  confirmed: { label: "Подтверждено",  color: "bg-blue-100 text-blue-700",    next: ["completed", "cancelled"]  },
  completed: { label: "Завершено",     color: "bg-green-100 text-green-700",  next: []                          },
  cancelled: { label: "Отменено",      color: "bg-red-100 text-red-600",      next: []                          },
} as const;

const NEXT_LABELS: Record<string, string> = {
  confirmed: "✓ Подтвердить",
  completed: "✓ Завершить",
  cancelled: "✕ Отменить",
};

export default function ManagerPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const l = params.locale;

  // ── Состояния ──────────────────────────────────────────────────────────────
  const [tab,        setTab]       = useState<"bookings" | "clients" | "equipment">("bookings");
  const [bookings,   setBookings]  = useState<Booking[]>([]);
  const [clients,    setClients]   = useState<Client[]>([]);
  const [products,   setProducts]  = useState<Product[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState("");

  // Фильтры для бронирований
  const [filterStatus, setFilterStatus] = useState(""); // "" = все
  const [filterSearch, setFilterSearch] = useState(""); // поиск по телефону

  // Выбранное бронирование для детального просмотра
  const [selected, setSelected] = useState<Booking | null>(null);
  // Заметка менеджера
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Данные текущего менеджера
  const [managerName, setManagerName] = useState("");

  // ── Вспомогательные ───────────────────────────────────────────────────────
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("pr_token") : null;

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  // ── Загрузка при входе ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push(`/${l}/auth`); return; }

    // Проверяем токен и получаем роль
    fetch(`${API}/auth/me`, { headers: authHeaders() })
      .then(r => r.json())
      .then(user => {
        if (user.role !== "manager" && user.role !== "admin") {
          router.push(`/${l}/auth`);
          return;
        }
        setManagerName(user.name);
        loadAll();
      })
      .catch(() => router.push(`/${l}/auth`));
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [bRes, cRes, pRes] = await Promise.all([
        fetch(`${API}/admin/bookings`,  { headers: authHeaders() }),
        fetch(`${API}/admin/users`,     { headers: authHeaders() }),
        fetch(`${API}/admin/products`,  { headers: authHeaders() }),
      ]);
      if (bRes.status === 401 || bRes.status === 403) {
        router.push(`/${l}/auth`); return;
      }
      setBookings(await bRes.json());
      setClients(await cRes.json());
      setProducts(await pRes.json());
    } catch {
      setError("Ошибка соединения. Бэкенд запущен?");
    } finally {
      setLoading(false);
    }
  }

  // ── Изменить статус бронирования ───────────────────────────────────────────
  async function changeStatus(booking: Booking, newStatus: string) {
    const action = NEXT_LABELS[newStatus] ?? newStatus;
    if (!confirm(`${action} бронирование #${booking.id}?`)) return;

    const res = await fetch(`${API}/admin/bookings/${booking.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === booking.id ? updated : b));
      // Обновляем selected если он открыт
      if (selected?.id === booking.id) setSelected(updated);
    } else {
      alert("Ошибка при изменении статуса");
    }
  }

  // ── Сохранить заметку менеджера ────────────────────────────────────────────
  async function saveNote(bookingId: number) {
    setSavingNote(true);
    const res = await fetch(`${API}/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ notes: noteText }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      setSelected(updated);
      alert("Заметка сохранена");
    }
    setSavingNote(false);
  }

  // ── Открыть детали бронирования ────────────────────────────────────────────
  function openBooking(b: Booking) {
    setSelected(b);
    setNoteText(b.notes || "");
  }

  // ── Фильтрация бронирований ────────────────────────────────────────────────
  const filtered = bookings.filter(b => {
    const matchStatus = !filterStatus || b.status === filterStatus;
    const matchSearch = !filterSearch ||
      b.user?.phone?.includes(filterSearch) ||
      b.user?.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      String(b.id).includes(filterSearch);
    return matchStatus && matchSearch;
  });

  // Счётчики по статусам
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // ── Рендер ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Шапка */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">
            📋 PeakRent — Менеджер
          </h1>
          {managerName && (
            <p className="text-xs text-gray-400 mt-0.5">Вы вошли как: {managerName}</p>
          )}
        </div>
        <button
          onClick={() => { localStorage.removeItem("pr_token"); router.push(`/${l}/auth`); }}
          className="text-sm text-red-500 hover:underline"
        >
          Выйти
        </button>
      </header>

      {/* Статус-карточки — быстрый обзор */}
      <div className="max-w-7xl mx-auto px-4 pt-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {(["pending", "confirmed", "completed", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
              className={`rounded-xl border p-3 text-left transition-all ${
                filterStatus === s ? "border-blue-400 bg-blue-50 shadow-sm" : "bg-white hover:border-gray-300"
              }`}>
              <p className="text-xl font-bold text-gray-700">{counts[s] || 0}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CONFIG[s].color}`}>
                {STATUS_CONFIG[s].label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">

        {/* Вкладки */}
        <div className="flex gap-1 border-b mb-5">
          {(["bookings","clients","equipment"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {{ bookings:"📅 Заказы", clients:"👥 Клиенты", equipment:"📦 Снаряжение" }[t]}
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {{ bookings: filtered.length, clients: clients.length, equipment: products.filter(p=>p.is_active).length }[t]}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Загружаем...</div>
        ) : (
          <div className="flex gap-5">

            {/* ═══════════════════════════════════════════════
                ВКЛАДКА: ЗАКАЗЫ
            ═══════════════════════════════════════════════ */}
            {tab === "bookings" && (
              <>
                {/* Левая панель — список */}
                <div className={`${selected ? "hidden lg:block" : "block"} flex-1 space-y-3`}>

                  {/* Поиск и фильтр */}
                  <div className="flex gap-2">
                    <input
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                      placeholder="Поиск по телефону, имени или №..."
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">Все статусы</option>
                      <option value="pending">Ожидает</option>
                      <option value="confirmed">Подтверждено</option>
                      <option value="completed">Завершено</option>
                      <option value="cancelled">Отменено</option>
                    </select>
                    {(filterStatus || filterSearch) && (
                      <button onClick={() => { setFilterStatus(""); setFilterSearch(""); }}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg hover:bg-gray-50">
                        Сбросить
                      </button>
                    )}
                  </div>

                  {/* Список бронирований */}
                  {filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border py-12 text-center text-gray-400">
                      Нет бронирований с этим фильтром
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map(b => {
                        const cfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG];
                        const nextStatuses = cfg?.next ?? [];
                        return (
                          <div key={b.id}
                            onClick={() => openBooking(b)}
                            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm hover:border-blue-200 ${
                              selected?.id === b.id ? "border-blue-400 shadow-sm" : ""
                            }`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                {/* Номер и статус */}
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-xs text-gray-400">#{b.id}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg?.color}`}>
                                    {cfg?.label}
                                  </span>
                                </div>

                                {/* Клиент */}
                                <p className="font-semibold text-gray-800 text-sm truncate">
                                  {b.user?.name || "Гость"} — {b.user?.phone}
                                </p>

                                {/* Снаряжение */}
                                <p className="text-gray-500 text-xs truncate mt-0.5">
                                  {b.items.map(i => i.equipment_name).join(", ") || "—"}
                                </p>

                                {/* Даты и сумма */}
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                  <span>📅 {b.start_date} → {b.end_date} ({b.days}д.)</span>
                                  <span className="font-semibold text-blue-600">
                                    {b.total_price?.toLocaleString()} ₸
                                  </span>
                                </div>
                              </div>

                              {/* Кнопки быстрого действия */}
                              {nextStatuses.length > 0 && (
                                <div className="flex flex-col gap-1 flex-shrink-0"
                                  onClick={e => e.stopPropagation()}>
                                  {nextStatuses.map(ns => (
                                    <button key={ns} onClick={() => changeStatus(b, ns)}
                                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                        ns === "cancelled"
                                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                                          : ns === "confirmed"
                                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                                          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                      }`}>
                                      {NEXT_LABELS[ns]}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Правая панель — детали выбранного бронирования */}
                {selected && (
                  <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white rounded-xl border p-5 sticky top-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800">Детали заказа</h3>
                        <button onClick={() => setSelected(null)}
                          className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                      </div>

                      {/* Номер брони */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-gray-400 mb-0.5">Номер брони</p>
                        <p className="font-mono font-bold text-gray-700">{selected.booking_number || `#${selected.id}`}</p>
                      </div>

                      {/* Клиент */}
                      <Section title="Клиент">
                        <Row label="Имя"    value={selected.user?.name || "Гость"} />
                        <Row label="Тел."   value={selected.user?.phone || "—"} />
                      </Section>

                      {/* Снаряжение */}
                      <Section title="Снаряжение">
                        {selected.items.map((item, i) => (
                          <div key={i} className="text-sm py-1 border-b border-gray-100 last:border-0">
                            <p className="text-gray-700 font-medium">{item.equipment_name}</p>
                            <p className="text-gray-400 text-xs">
                              {item.quantity} шт.{item.size ? ` · р. ${item.size}` : ""} · {item.subtotal?.toLocaleString()} ₸
                            </p>
                          </div>
                        ))}
                      </Section>

                      {/* Даты и оплата */}
                      <Section title="Аренда">
                        <Row label="Начало"  value={selected.start_date} />
                        <Row label="Конец"   value={selected.end_date} />
                        <Row label="Дней"    value={`${selected.days} д.`} />
                        <Row label="Итого"   value={`${selected.total_price?.toLocaleString()} ₸`} bold />
                        <Row label="Оплата"  value={selected.payment_method || "—"} />
                      </Section>

                      {/* Статус + кнопки */}
                      <Section title="Статус">
                        <div className="mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            STATUS_CONFIG[selected.status as keyof typeof STATUS_CONFIG]?.color
                          }`}>
                            {STATUS_CONFIG[selected.status as keyof typeof STATUS_CONFIG]?.label || selected.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {(STATUS_CONFIG[selected.status as keyof typeof STATUS_CONFIG]?.next ?? []).map(ns => (
                            <button key={ns} onClick={() => changeStatus(selected, ns)}
                              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                ns === "cancelled"
                                  ? "bg-red-50 text-red-600 hover:bg-red-100"
                                  : ns === "confirmed"
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-blue-500 text-white hover:bg-blue-600"
                              }`}>
                              {NEXT_LABELS[ns]}
                            </button>
                          ))}
                        </div>
                      </Section>

                      {/* Заметка менеджера */}
                      <Section title="Заметка менеджера">
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          rows={3}
                          placeholder="Клиент позвонил, подтвердил получение..."
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                        />
                        <button onClick={() => saveNote(selected.id)} disabled={savingNote}
                          className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                          {savingNote ? "Сохраняем..." : "Сохранить заметку"}
                        </button>
                      </Section>
                    </div>
                  </div>
                )}
              </>
            )}


            {/* ═══════════════════════════════════════════════
                ВКЛАДКА: КЛИЕНТЫ
            ═══════════════════════════════════════════════ */}
            {tab === "clients" && (
              <div className="flex-1 bg-white rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Клиент</th>
                      <th className="px-4 py-3 text-left">Телефон</th>
                      <th className="px-4 py-3 text-left">Всего аренд</th>
                      <th className="px-4 py-3 text-left">Активных</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clients.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Нет клиентов</td></tr>
                    )}
                    {clients.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-700">{c.name || "—"}</p>
                          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                        <td className="px-4 py-3 text-gray-600">{c.booking_count}</td>
                        <td className="px-4 py-3">
                          {c.active_bookings > 0 ? (
                            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {c.active_bookings} активных
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}


            {/* ═══════════════════════════════════════════════
                ВКЛАДКА: СНАРЯЖЕНИЕ (только просмотр)
            ═══════════════════════════════════════════════ */}
            {tab === "equipment" && (
              <div className="flex-1 space-y-3">
                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg">
                  ℹ️ Вы можете просматривать снаряжение. Для изменения — обратитесь к администратору.
                </div>
                <div className="bg-white rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Название</th>
                        <th className="px-4 py-3 text-left">Цена/день</th>
                        <th className="px-4 py-3 text-left">На складе</th>
                        <th className="px-4 py-3 text-left">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map(p => (
                        <tr key={p.id} className={`hover:bg-gray-50 ${!p.is_active ? "opacity-40" : ""}`}>
                          <td className="px-4 py-3 font-medium text-gray-700">{p.name_ru}</td>
                          <td className="px-4 py-3 font-semibold text-blue-600">
                            {p.price_per_day.toLocaleString()} ₸
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${
                              p.stock === 0 ? "text-red-500" :
                              p.stock <= 2  ? "text-amber-600" : "text-gray-700"
                            }`}>
                              {p.stock} шт.
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              {p.is_active ? "Активно" : "Скрыто"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Вспомогательные компоненты ──────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-gray-400">{label}</span>
      <span className={bold ? "font-bold text-gray-800" : "text-gray-700"}>{value}</span>
    </div>
  );
}
