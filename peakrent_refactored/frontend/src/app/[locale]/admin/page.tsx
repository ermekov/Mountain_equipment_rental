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
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

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

// Пустая форма для добавления нового товара
const EMPTY_FORM = {
  name: "", description: "", price: "", stock: "1", image_url: "",
};

export default function AdminPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const l = params.locale;

  // ── Состояния ──────────────────────────────────────────────────────────────
  const [tab,      setTab]      = useState<"products"|"bookings"|"users">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  // Форма добавления товара
  const [addForm, setAddForm]   = useState(EMPTY_FORM);
  const [adding,  setAdding]    = useState(false);

  // Какой товар сейчас редактируется (null = никакой)
  // editData хранит текущие значения полей редактируемой строки
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    name: string; description: string; price: string;
    stock: string; image_url: string; is_featured: boolean;
  }>({ name: "", description: "", price: "", stock: "", image_url: "", is_featured: false });
  const [saving, setSaving] = useState(false);

  // ── Вспомогательные ───────────────────────────────────────────────────────
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("pr_token") : null;

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  // ── Загрузка данных при входе на страницу ─────────────────────────────────
  useEffect(() => {
    if (!getToken()) { router.push(`/${l}/auth`); return; }
    loadAll();
  }, []);

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
    } catch {
      setError("Ошибка соединения. Бэкенд запущен на порту 5000?");
    } finally {
      setLoading(false);
    }
  }

  // ── Добавить товар ─────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name || !addForm.price) {
      alert("Заполните название и цену");
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
      if (!res.ok) { alert((await res.json()).error || "Ошибка"); return; }
      const created = await res.json();
      setProducts(prev => [created, ...prev]); // новый товар в начало списка
      setAddForm(EMPTY_FORM);
    } catch { alert("Ошибка соединения"); }
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
      alert("Название и цена не могут быть пустыми");
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
      if (!res.ok) { alert((await res.json()).error || "Ошибка"); return; }
      const updated = await res.json();
      // Заменяем старый объект в списке на обновлённый
      setProducts(prev => prev.map(p => p.id === id ? updated : p));
      setEditId(null); // закрываем режим редактирования
    } catch { alert("Ошибка соединения"); }
    finally { setSaving(false); }
  }

  // ── Удалить (скрыть) товар ─────────────────────────────────────────────────
  async function handleDelete(id: number, name: string) {
    if (!confirm(`Скрыть "${name}" из каталога?`)) return;
    const res = await fetch(`${API}/admin/products/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    if (res.ok) setProducts(prev => prev.filter(p => p.id !== id));
    else alert("Ошибка при удалении");
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

  // ── Рендер ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Шапка */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">🏔 PeakRent — Администратор</h1>
        <button
          onClick={() => { localStorage.removeItem("pr_token"); router.push(`/${l}/auth`); }}
          className="text-sm text-red-500 hover:underline"
        >
          Выйти
        </button>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Вкладки */}
        <div className="flex gap-1 border-b">
          {(["products","bookings","users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {{ products:"📦 Снаряжение", bookings:"📅 Бронирования", users:"👥 Пользователи" }[t]}
              <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {{ products:products.length, bookings:bookings.length, users:users.length }[t]}
              </span>
            </button>
          ))}
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Загружаем...</div>
        ) : (
          <>

            {/* ════════════════════════════════════════
                ВКЛАДКА: СНАРЯЖЕНИЕ
            ════════════════════════════════════════ */}
            {tab === "products" && (
              <div className="space-y-5">

                {/* Форма добавления нового товара */}
                <div className="bg-white rounded-xl border p-5">
                  <h2 className="font-semibold text-gray-700 mb-4">➕ Добавить снаряжение</h2>
                  <form onSubmit={handleAdd}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                    <Field label="Название *">
                      <input value={addForm.name}
                        onChange={e => setAddForm({...addForm, name: e.target.value})}
                        placeholder="Горнолыжный шлем" className={input} />
                    </Field>

                    <Field label="Цена ₸/день *">
                      <input type="number" value={addForm.price}
                        onChange={e => setAddForm({...addForm, price: e.target.value})}
                        placeholder="5000" className={input} />
                    </Field>

                    <Field label="Остаток (шт.)">
                      <input type="number" value={addForm.stock}
                        onChange={e => setAddForm({...addForm, stock: e.target.value})}
                        placeholder="10" className={input} />
                    </Field>

                    <Field label="Описание">
                      <input value={addForm.description}
                        onChange={e => setAddForm({...addForm, description: e.target.value})}
                        placeholder="Краткое описание" className={input} />
                    </Field>

                    <Field label="URL фотографии">
                      <input type="url" value={addForm.image_url}
                        onChange={e => setAddForm({...addForm, image_url: e.target.value})}
                        placeholder="https://..." className={input} />
                    </Field>

                    <div className="flex items-end">
                      <button type="submit" disabled={adding}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                        {adding ? "Добавляем..." : "Добавить"}
                      </button>
                    </div>

                  </form>
                </div>

                {/* Таблица снаряжения */}
                <div className="bg-white rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-3 text-left w-14">Фото</th>
                        <th className="px-3 py-3 text-left">Название</th>
                        <th className="px-3 py-3 text-left">Описание</th>
                        <th className="px-3 py-3 text-left w-28">Цена/день</th>
                        <th className="px-3 py-3 text-left w-24">Остаток</th>
                        <th className="px-3 py-3 text-left w-20">Featured</th>
                        <th className="px-3 py-3 text-left w-36">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                            Снаряжения нет. Добавьте первое ↑
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
                                  : <div className="w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">нет</div>
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
                                    className={inputSm + " w-full"} placeholder="Название" />
                                  {/* URL фото — в строке названия для удобства */}
                                  <input value={editData.image_url}
                                    onChange={e => setEditData({...editData, image_url: e.target.value})}
                                    className={inputSm + " w-full"} placeholder="URL фото" />
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
                                  className={inputSm + " w-full"} placeholder="Описание" />
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
                                }`}>{p.stock} шт.</span>
                              )}
                            </td>

                            {/* ── Featured ── */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="checkbox" checked={editData.is_featured}
                                    onChange={e => setEditData({...editData, is_featured: e.target.checked})}
                                    className="w-4 h-4 rounded" />
                                  <span className="text-xs text-gray-600">Главная</span>
                                </label>
                              ) : (
                                p.is_featured
                                  ? <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">★ Топ</span>
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
                                    {saving ? "..." : "Сохранить"}
                                  </button>
                                  <button onClick={cancelEdit}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    Отмена
                                  </button>
                                </div>
                              ) : (
                                // Обычный режим: Изменить / Удалить
                                <div className="flex gap-1">
                                  <button onClick={() => startEdit(p)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    Изменить
                                  </button>
                                  <button onClick={() => handleDelete(p.id, p.name_ru)}
                                    className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                    Удалить
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
                      <th className="px-4 py-3 text-left">Клиент</th>
                      <th className="px-4 py-3 text-left">Снаряжение</th>
                      <th className="px-4 py-3 text-left">Период</th>
                      <th className="px-4 py-3 text-left">Сумма</th>
                      <th className="px-4 py-3 text-left">Статус</th>
                      <th className="px-4 py-3 text-left">Изменить</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bookings.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Бронирований нет</td></tr>
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
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select value={b.status}
                            onChange={e => changeBookingStatus(b.id, e.target.value)}
                            className="text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400">
                            <option value="pending">pending</option>
                            <option value="confirmed">confirmed</option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
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
                      <th className="px-4 py-3 text-left">Имя</th>
                      <th className="px-4 py-3 text-left">Телефон</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Роль</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Нет пользователей</td></tr>
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
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
