import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Equipment, CartItem } from "@/lib/types";
import { daysBetween } from "@/lib/utils";

// -- Auth Store ---
interface AuthStore {
  user:  User | null;
  token: string | null;
  setAuth:    (user: User, token: string) => void;
  clearAuth:  () => void;
  isLoggedIn: () => boolean;
  isAdmin:    () => boolean;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null, token: null,
      setAuth: (user, token) => {
        set({ user, token });
        if (typeof window !== "undefined") {
          localStorage.setItem("pr_token", token);
          document.cookie = `pr_token=${token}; path=/; max-age=2592000`;
          document.cookie = `peakrent_role=${user.role}; path=/`;
        }
      },
      clearAuth: () => {
        set({ user: null, token: null });
        if (typeof window !== "undefined") {
          localStorage.removeItem("pr_token");
          document.cookie = "pr_token=; path=/; max-age=0";
        }
      },
      isLoggedIn: () => !!get().user,
      isAdmin:    () => get().user?.role === "admin",
    }),
    { name: "peakrent-auth", partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

// -- Cart / Booking Store --
interface CartStore {
  items:      CartItem[];
  start_date: string;
  end_date: string;
  addItem:    (equipment: Equipment, qty: number, size: string | null, days: number) => void;
  updateItem: (equipment_id: number, qty: number, size?: string | null) => void;
  removeItem: (equipment_id: number) => void;
  clearCart:  () => void;
  setRentalPeriod: (start_date: string, end_date: string) => void;
  totalPrice: () => number;
}

const recalcItem = (item: CartItem, days: number) => ({
  ...item,
  days,
  subtotal: item.equipment.price_per_day * item.quantity * days,
});

export const useBookingStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      start_date: "",
      end_date: "",
      addItem: (equipment, qty, size, days) => {
        const safeDays = Math.max(1, days);
        const subtotal = equipment.price_per_day * qty * safeDays;
        const idx = get().items.findIndex((i) => i.equipment_id === equipment.id);
        if (idx >= 0) {
          const updated = [...get().items];
          updated[idx] = { ...updated[idx], quantity: qty, size, days: safeDays, subtotal };
          set({ items: updated });
        } else {
          set({
            items: [...get().items, { equipment_id: equipment.id, equipment, quantity: qty, size, days: safeDays, subtotal }],
          });
        }
      },
      updateItem: (equipment_id, qty, size) => {
        const currentDays = get().start_date && get().end_date
          ? Math.max(1, daysBetween(get().start_date, get().end_date))
          : undefined;
        set({
          items: get().items.map((item) =>
            item.equipment_id === equipment_id
              ? recalcItem(
                  {
                    ...item,
                    quantity: Math.max(1, qty),
                    size: size === undefined ? item.size : size,
                  },
                  currentDays ?? item.days
                )
              : item
          ),
        });
      },
      removeItem: (equipment_id) =>
        set({ items: get().items.filter((i) => i.equipment_id !== equipment_id) }),
      clearCart: () => set({ items: [], start_date: "", end_date: "" }),
      setRentalPeriod: (start_date, end_date) => {
        const days = start_date && end_date ? Math.max(1, daysBetween(start_date, end_date)) : 1;
        set({
          start_date,
          end_date,
          items: get().items.map((item) => recalcItem(item, days)),
        });
      },
      totalPrice: () => get().items.reduce((s, i) => s + i.subtotal, 0),
    }),
    {
      name: "peakrent-cart",
      partialize: (s) => ({
        items: s.items,
        start_date: s.start_date,
        end_date: s.end_date,
      }),
    }
  )
);
