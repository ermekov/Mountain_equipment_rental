import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { Providers } from "@/components/layout/providers";
import ChatWidget from "@/components/chat/ChatWidget";

const locales = ["ru", "kk", "en"] as const;

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
    <NextIntlClientProvider messages={messages}>
      <Providers>{children}</Providers>

      {/* AI чат-виджет — оң жақ төменгі бұрышта */}
      <ChatWidget locale={locale} />

      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{ classNames: { toast: "font-body rounded-xl" } }}
      />
    </NextIntlClientProvider>
  );
}
