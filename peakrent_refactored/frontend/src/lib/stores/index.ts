import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Equipment, CartItem } from "@/lib/types";
import { daysBetween } from "@/lib/utils";

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

interface CartStore {
  items:      CartItem[];
  addItem:    (equipment: Equipment, qty: number, size: string | null, start_date: string, end_date: string) => void;
  updateItem: (equipment_id: number, data: { qty?: number; size?: string | null; start_date?: string; end_date?: string }) => void;
  removeItem: (equipment_id: number) => void;
  clearCart:  () => void;
  totalPrice: () => number;
}

const getSafeDays = (start_date: string, end_date: string) =>
  start_date && end_date ? Math.max(1, daysBetween(start_date, end_date)) : 1;

const recalcItem = (item: CartItem) => {
  const days = getSafeDays(item.start_date, item.end_date);
  return {
    ...item,
    days,
    subtotal: item.equipment.price_per_day * item.quantity * days,
  };
};

export const useBookingStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (equipment, qty, size, start_date, end_date) => {
        const idx = get().items.findIndex((i) => i.equipment_id === equipment.id);
        if (idx >= 0) {
          const updated = [...get().items];
          updated[idx] = recalcItem({
            ...updated[idx],
            quantity: qty,
            size,
            start_date,
            end_date,
          });
          set({ items: updated });
        } else {
          set({
            items: [
              ...get().items,
              recalcItem({
                equipment_id: equipment.id,
                equipment,
                quantity: qty,
                size,
                start_date,
                end_date,
                days: 1,
                subtotal: 0,
              }),
            ],
          });
        }
      },
      updateItem: (equipment_id, data) => {
        set({
          items: get().items.map((item) =>
            item.equipment_id === equipment_id
              ? recalcItem({
                  ...item,
                  quantity: data.qty === undefined ? item.quantity : Math.max(1, data.qty),
                  size: data.size === undefined ? item.size : data.size,
                  start_date: data.start_date ?? item.start_date,
                  end_date: data.end_date ?? item.end_date,
                })
              : item
          ),
        });
      },
      removeItem: (equipment_id) =>
        set({ items: get().items.filter((i) => i.equipment_id !== equipment_id) }),
      clearCart: () => set({ items: [] }),
      totalPrice: () => get().items.reduce((s, i) => s + i.subtotal, 0),
    }),
    {
      name: "peakrent-cart",
      partialize: (s) => ({ items: s.items }),
    }
  )
);
