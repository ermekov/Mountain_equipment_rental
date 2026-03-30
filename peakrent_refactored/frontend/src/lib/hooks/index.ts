"use client";
import { useQuery } from "@tanstack/react-query";
import { equipmentAPI, bookingAPI, reviewAPI, weatherAPI } from "@/lib/api/client";

export function useEquipmentList(params?: any) {
  return useQuery({
    queryKey: ["equipment", "list", params],
    queryFn:  () => equipmentAPI.list(params).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useEquipment(slug: string) {
  return useQuery({
    queryKey: ["equipment", slug],
    queryFn:  () => equipmentAPI.getOne(slug).then((r) => r.data),
    enabled:  !!slug,
  });
}

export function useFeatured(limit = 6) {
  return useQuery({
    queryKey: ["equipment", "featured", limit],
    queryFn:  () => equipmentAPI.featured(limit).then((r) => r.data),
    staleTime: 120_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn:  () => equipmentAPI.categories().then((r) => r.data),
    staleTime: 300_000,
  });
}

export function useAvailability(ids: number[], startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["availability", ids, startDate, endDate],
    queryFn:  () => equipmentAPI.availability(ids, startDate, endDate).then((r) => r.data),
    enabled:  ids.length > 0 && !!startDate && !!endDate,
    refetchInterval: 30_000,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "my"],
    queryFn:  () => bookingAPI.list().then((r) => r.data),
  });
}

export function useReviews(equipmentId: number) {
  return useQuery({
    queryKey: ["reviews", equipmentId],
    queryFn:  () => reviewAPI.list(equipmentId).then((r) => r.data),
    staleTime: 120_000,
  });
}

export function useWeather(city = "Алматы") {
  return useQuery({
    queryKey: ["weather", city],
    queryFn:  () => weatherAPI.current(city).then((r) => r.data),
    staleTime: 600_000,
  });
}
