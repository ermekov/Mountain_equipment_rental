import axios from "axios";
import type {
  Equipment, Category, Booking, Review,
  RecommendationResponse, User,
} from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const apiClient = axios.create({ baseURL: BASE, timeout: 15000 });

// Прикрепляем JWT токен к каждому запросу
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("pr_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -- Авторизация ---
export const authAPI = {
  sendOtp:   (data: { email?: string; phone?: string }) =>
    apiClient.post<{ message: string; dev_code?: string }>("/auth/send-otp", data),
  verifyOtp: (data: { phone?: string; email?: string; code: string }) =>
    apiClient.post<{ access_token: string; user: User }>("/auth/verify-otp", data),
  register:  (data: { name: string; email: string; phone: string; password: string; code: string }) =>
    apiClient.post<{ access_token: string; user: User }>("/auth/register", data),
  login:     (data: { login: string; password: string }) =>
    apiClient.post<{ access_token: string; user: User }>("/auth/login", data),
  getMe:     () => apiClient.get<User>("/auth/me"),
  updateMe:  (data: { name?: string }) => apiClient.put<User>("/auth/me", data),
};

// -- Снаряжение ---
export const equipmentAPI = {
  list: (params?: {
    category?: string; search?: string; min_price?: number;
    max_price?: number; start_date?: string; end_date?: string;
    limit?: number; sort?: string; gender?: string;
  }) => apiClient.get<Equipment[]>("/equipment", { params }),

  featured:     (limit = 6) => apiClient.get<Equipment[]>("/equipment/featured", { params: { limit } }),
  getOne:       (slug: string) => apiClient.get<Equipment>(`/equipment/${slug}`),
  categories:   () => apiClient.get<Category[]>("/equipment/categories"),
  availability: (ids: number[], start_date: string, end_date: string) =>
    apiClient.post<Record<string, number>>("/equipment/availability", { ids, start_date, end_date }),
  update:       (id: number, data: any) => apiClient.put<Equipment>(`/equipment/${id}`, data),
  delete:       (id: number) => apiClient.delete(`/equipment/${id}`),
};

export const favoriteAPI = {
  list: () => apiClient.get<Equipment[]>("/equipment/favorites"),
  add: (equipmentId: number) => apiClient.post(`/equipment/${equipmentId}/favorite`),
  remove: (equipmentId: number) => apiClient.delete(`/equipment/${equipmentId}/favorite`),
};

// -- Бронирования ---
export const bookingAPI = {
  create: (data: any) => apiClient.post<Booking>("/bookings", data),
  list:   ()           => apiClient.get<Booking[]>("/bookings/my"),
  getOne: (id: string | number) => apiClient.get<Booking>(`/bookings/${id}`),
  cancel: (id: number) => apiClient.delete(`/bookings/${id}`),
};

// -- Рекомендации ---
export const recommendAPI = {
  get: (data: {
    activity?: string; city?: string; level?: string;
    start_date?: string; end_date?: string; limit?: number;
    budget_max?: number; locale?: string; temperature?: number; weather?: string;
  }) => apiClient.post<RecommendationResponse>("/recommendations", data),

  related: (equipment_id: number, limit = 3) =>
    apiClient.get<Equipment[]>("/recommendations/related", { params: { equipment_id, limit } }),
};

// -- AI чат ---
export const aiAPI = {
  chat: (data: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    city?: string; locale?: string;
  }) => apiClient.post<{ reply: string }>("/ai/chat", data),

  suggest: (data: { activity: string; city?: string; temperature?: number; locale?: string }) =>
    apiClient.post<{ suggestion: string }>("/ai/suggest", data),
};

// ── Отзывы ────────────────────────────────────────────────────────────────────
export const reviewAPI = {
  list:   (equipment_id: number) => apiClient.get<Review[]>(`/reviews/${equipment_id}`),
  create: (data: { equipment_id: number; rating: number; comment?: string; booking_id?: number }) =>
    apiClient.post<Review>("/reviews", data),
};

// ── Погода ────────────────────────────────────────────────────────────────────
export const weatherAPI = {
  current: (city = "Алматы") =>
    apiClient.get<{
      temp: number; feels_like: number; condition: string;
      humidity: number; wind_speed: number; city: string;
    }>("/weather", { params: { city } }),
};

// ── Оплата ────────────────────────────────────────────────────────────────────
export const paymentAPI = {
  kaspiInit: (data: { booking_id: string | number; name: string; phone: string }) =>
    apiClient.post<{ payment_id: string; qr_code: string; expires_at: string; amount: number }>(
      "/payments/kaspi/init", data
    ),
  cardInit: (data: { booking_id: string | number; name: string; phone: string }) =>
    apiClient.post<{ payment_id: string; payment_url: string }>("/payments/card/init", data),
  status: (paymentId: string) =>
    apiClient.get<{ status: "pending" | "paid" | "expired" | "failed"; paid_at?: string }>(
      `/payments/${paymentId}/status`
    ),
};

// ── Администратор ─────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:         () => apiClient.get<any>("/admin/stats"),
  bookings:      (params?: { status?: string }) => apiClient.get<Booking[]>("/admin/bookings", { params }),
  updateBooking: (id: number, data: { status?: string }) =>
    apiClient.patch<Booking>(`/admin/bookings/${id}`, data),
  users:         () => apiClient.get<User[]>("/admin/users"),
};
