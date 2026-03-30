import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Equipment, CartItem } from "@/lib/types";

// ── Auth Store ────────────────────────────────────────────────────────────────
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

// ── Cart / Booking Store ──────────────────────────────────────────────────────
interface CartStore {
  items:      CartItem[];
  addItem:    (equipment: Equipment, qty: number, size: string | null, days: number) => void;
  removeItem: (equipment_id: number) => void;
  clearCart:  () => void;
  totalPrice: () => number;
}

export const useBookingStore = create<CartStore>()((set, get) => ({
  items: [],
  addItem: (equipment, qty, size, days) => {
    const subtotal = equipment.price_per_day * qty * days;
    const idx = get().items.findIndex((i) => i.equipment_id === equipment.id);
    if (idx >= 0) {
      const updated = [...get().items];
      updated[idx] = { ...updated[idx], quantity: qty, size, days, subtotal };
      set({ items: updated });
    } else {
      set({ items: [...get().items, { equipment_id: equipment.id, equipment, quantity: qty, size, days, subtotal }] });
    }
  },
  removeItem: (equipment_id) =>
    set({ items: get().items.filter((i) => i.equipment_id !== equipment_id) }),
  clearCart:  () => set({ items: [] }),
  totalPrice: () => get().items.reduce((s, i) => s + i.subtotal, 0),
}));
