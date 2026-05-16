import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/navbar";
import { equipmentAPI } from "@/lib/api/client";
import type { Equipment, Locale } from "@/lib/types";
import HomePageClient from "./page.client";

export const metadata: Metadata = {
  title: "PeakRent - Premium mountain gear rental in Almaty",
  description: "PeakRent.kz - online rental platform for ski, snowboard, hiking, trekking and climbing gear in Almaty.",
};

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale as Locale;

  let featured: Equipment[] = [];
  try {
    featured = (await equipmentAPI.featured(6)).data;
  } catch {
    featured = [];
  }

  return (
    <>
      <Navbar locale={locale} />
      <Suspense fallback={<main className="min-h-screen bg-navy" />}>
        <HomePageClient locale={locale} featured={featured} />
      </Suspense>
    </>
  );
}
