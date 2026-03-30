import Link from "next/link";
import { CheckCircle2, MapPin, Calendar, Phone } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import type { Locale } from "@/lib/types";

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const l = locale as Locale;

  return (
    <>
      <Navbar locale={l} />
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          {/* Иконка успеха */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-green-200 animate-ping opacity-30" />
          </div>

          <h1 className="font-display text-2xl font-extrabold text-navy mb-2">
            {l === "ru" ? "Бронирование подтверждено!" : "Booking Confirmed!"}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {l === "ru"
              ? "SMS с QR-кодом отправлено на ваш номер"
              : "SMS with QR code sent to your phone"}
          </p>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden text-left mb-6">
            {/* Номер брони */}
            <div className="bg-navy px-6 py-4 text-center">
              <p className="text-white font-display font-bold text-sm">
                {l === "ru" ? "Номер брони" : "Booking ID"}
              </p>
              <p className="font-mono text-ice text-lg">#{id}</p>
            </div>

            <div className="p-5 space-y-3">
              {[
                {
                  icon: <span className="text-lg">📱</span>,
                  title: l === "ru" ? "Сохраните QR-код"     : "Save QR code",
                  desc:  l === "ru" ? "QR из SMS нужен на пункте выдачи" : "QR from SMS needed at pickup",
                },
                {
                  icon: <MapPin className="w-5 h-5 text-green-600" />,
                  title: l === "ru" ? "Пункт выдачи"          : "Pickup Point",
                  desc:  l === "ru" ? "ул. Достык 123, Алматы. Ежедневно 08:00–22:00. Выдача 5 минут." : "Dosyk 123, Almaty. 08:00–22:00 daily. 5-min pickup.",
                },
                {
                  icon: <Calendar className="w-5 h-5 text-amber-500" />,
                  title: l === "ru" ? "Напоминание"           : "Reminder",
                  desc:  l === "ru" ? "SMS за 2 дня до возврата снаряжения" : "SMS 2 days before equipment return.",
                },
              ].map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center flex-shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-navy">{s.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}

              {/* Телефон */}
              <div className="flex items-center gap-2 bg-surface rounded-xl p-3 border border-slate-100">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">{l === "ru" ? "Вопросы?" : "Questions?"}</p>
                  <a href="tel:+77071234567" className="font-bold text-sm text-ice">
                    +7 (707) 123-45-67
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/${locale}/catalog`} className="btn-secondary text-sm text-center !py-3">
              {l === "ru" ? "Ещё снаряжение" : "More Gear"}
            </Link>
            <Link href={`/${locale}/profile`} className="btn-primary text-sm text-center !py-3">
              {l === "ru" ? "Мои брони" : "My Bookings"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
