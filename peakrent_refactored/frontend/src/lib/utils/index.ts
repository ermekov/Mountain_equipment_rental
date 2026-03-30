import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString("ru-KZ") + " ₸";
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-KZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(0, Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  ));
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const r = (err as any).response;
    return r?.data?.error ?? r?.data?.message ?? "Ошибка запроса";
  }
  return "Неизвестная ошибка";
}
