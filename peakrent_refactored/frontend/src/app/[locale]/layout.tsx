import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { Providers } from "@/components/layout/providers";
import ChatWidget from "@/components/chat/ChatWidget";
import "@/styles/globals.css";

// Instrument Sans — основной текст (Google Fonts)
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument",
  display: "swap",
});

// JetBrains Mono — для кодов бронирований
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

const locales = ["ru", "kk", "en"] as const;

export const metadata: Metadata = {
  metadataBase: new URL("https://peakrent.kz"),
  title: {
    template: "%s | PeakRent — Аренда горного снаряжения",
    default:  "PeakRent — Аренда горного снаряжения в Алматы",
  },
  description:
    "Аренда лыж, сноубордов, треккингового и альпинистского снаряжения в Алматы. " +
    "Онлайн-бронирование, Kaspi QR, AI-рекомендации.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A1628",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) notFound();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>

        {/* ── AI Чат-виджет — оң төменгі бұрышта, барлық беттерде ── */}
        <ChatWidget locale={locale} />

        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ classNames: { toast: "font-body rounded-xl" } }}
        />
      </body>
    </html>
  );
}
