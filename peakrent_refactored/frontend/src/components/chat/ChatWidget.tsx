"use client";
/**
 * src/components/chat/ChatWidget.tsx
 * =====================================
 * AI-ассистент чат виджеті — оң төменгі бұрышта пайда болады.
 *
 * Жұмыс принципі:
 *   1. Виджет ашылғанда → GET /api/chat/widget/start → сәлемдесу
 *   2. Пайдаланушы жазады → POST /api/chat/widget → жауап + жылдам батырмалар
 *   3. Тарих (messages[]) state-те сақталады → GPT контекстті ескереді
 *
 * Болашақта жақсарту мүмкіндіктері:
 *   - localStorage-ге тарихты сақтау (бет жаңартылса жоғалмасын)
 *   - Серверге тарихты сақтау (пайдаланушы кірген кезде жалғастыру)
 *   - Дыбыс хабарландыруы (жаңа хабар келгенде)
 *   - Файл жіберу (суреттер арқылы жабдықты анықтау)
 */

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
const LOCALE_PREFIX_RE = /^\/(ru|kk|en)(?=\/|$)/i;
const INTERNAL_ROUTE_RE =
  /\/(?:catalog|ai|checkout|profile|cart|favorites|auth|equipment\/[A-Za-z0-9-]+)(?:\?[A-Za-z0-9=&_-]+)?/g;

function normalizeChatHref(href: string, locale: string): string {
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) {
    return href;
  }

  if (!href.startsWith("/")) {
    return href;
  }

  if (href === "/") {
    return `/${locale}`;
  }

  if (LOCALE_PREFIX_RE.test(href)) {
    return href;
  }

  return `/${locale}${href}`;
}

function renderChatLink(
  label: string,
  href: string,
  locale: string,
  isUserMessage: boolean,
  key: string
) {
  const normalizedHref = normalizeChatHref(href, locale);
  const linkClassName = isUserMessage
    ? "font-medium underline underline-offset-2 text-white"
    : "font-medium underline underline-offset-2 text-[#0284C7] transition-colors hover:text-[#0EA5E9]";

  if (/^(https?:\/\/|mailto:|tel:)/i.test(normalizedHref)) {
    return (
      <a
        key={key}
        href={normalizedHref}
        target="_blank"
        rel="noreferrer"
        className={linkClassName}
      >
        {label}
      </a>
    );
  }

  return (
    <Link key={key} href={normalizedHref} className={linkClassName}>
      {label}
    </Link>
  );
}

function renderRouteText(text: string, locale: string, isUserMessage: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INTERNAL_ROUTE_RE.lastIndex = 0;

  while ((match = INTERNAL_ROUTE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      renderChatLink(match[0], match[0], locale, isUserMessage, `route-${match.index}-${match[0]}`)
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function renderMessageLine(text: string, locale: string, isUserMessage: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const markdownLinkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownLinkRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...renderRouteText(text.slice(lastIndex, match.index), locale, isUserMessage)
      );
    }

    nodes.push(
      renderChatLink(match[1], match[2], locale, isUserMessage, `md-${match.index}-${match[2]}`)
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderRouteText(text.slice(lastIndex), locale, isUserMessage));
  }

  return nodes.length > 0 ? nodes : [text];
}

// ── Типтер ────────────────────────────────────────────────────────────────
interface Message {
  role:      "user" | "assistant";
  content:   string;
  timestamp: Date;
}

interface ChatWidgetProps {
  locale?: string;  // тіл коды: "ru" | "kk" | "en"
}

export default function ChatWidget({ locale = "ru" }: ChatWidgetProps) {
  // ── Күй айнымалылары ───────────────────────────────────────────────────
  const [isOpen,       setIsOpen]       = useState(false);    // виджет ашық па
  const [messages,     setMessages]     = useState<Message[]>([]); // хабарлар тарихы
  const [inputText,    setInputText]    = useState("");        // енгізу жолы
  const [isTyping,     setIsTyping]     = useState(false);    // бот жауап беруде
  const [quickReplies, setQuickReplies] = useState<string[]>([]);  // жылдам батырмалар
  const [hasUnread,    setHasUnread]    = useState(false);    // оқылмаған хабар

  const messagesEndRef = useRef<HTMLDivElement>(null); // соңғы хабарға scroll
  const inputRef       = useRef<HTMLInputElement>(null);
  const hasUserMessages = messages.some(message => message.role === "user");

  // ── Жауап алынғанда автоматты scroll ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Виджет ашылғанда: сәлемдесу хабарын жүктеу ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Егер бірінші ашылу болса — сервердан сәлемдесу аламыз
    if (messages.length === 0) {
      loadGreeting();
    }

    setHasUnread(false);
    // Input-қа фокус
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  async function loadGreeting() {
    try {
      const token = localStorage.getItem("pr_token");
      const res   = await fetch(`${API}/chat/widget/start?locale=${locale}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      // Сәлемдесу хабарын messages-ке қосамыз
      addBotMessage(data.greeting);
      setQuickReplies(data.quick_replies || []);
    } catch {
      addBotMessage(
        locale === "kk"
          ? "Сәлем! Қандай жабдық керек екенін айтыңыз, көмектесемін."
          : "Здравствуйте! Напишите, что вы ищете, и я помогу с выбором."
      );
    }
  }

  // ── Хабар жіберу ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    // Пайдаланушы хабарын тізімге қосамыз
    const userMsg: Message = {
      role:      "user",
      content:   trimmed,
      timestamp: new Date(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setQuickReplies([]); // жылдам батырмаларды жасырамыз (жауап келгенше)
    setIsTyping(true);

    try {
      const token = localStorage.getItem("pr_token");

      const res = await fetch(`${API}/chat/widget`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          // Тек role + content жібереміз (timestamps серверге керек емес)
          messages: updatedMessages.map(m => ({
            role:    m.role,
            content: m.content,
          })),
          locale,
        }),
      });

      const data = await res.json();

      addBotMessage(data.reply);
      setQuickReplies([]);

      // Виджет жабық болса — оқылмаған белгісі
      if (!isOpen) setHasUnread(true);

    } catch {
      addBotMessage(
        locale === "kk"
          ? "Кешіріңіз, қазір қосылу мүмкін емес. Менеджерге хабарласыңыз: +7 (707) 123-45-67"
          : "Извините, сейчас нет связи. Обратитесь к менеджеру: +7 (707) 123-45-67"
      );
    } finally {
      setIsTyping(false);
    }
  }, [messages, isTyping, locale, isOpen]);

  // ── Бот хабарын қосу (уақыт белгісімен) ──────────────────────────────
  function addBotMessage(content: string) {
    setMessages(prev => [
      ...prev,
      { role: "assistant", content, timestamp: new Date() },
    ]);
  }

  // ── Enter пернесі ─────────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  // ── Уақытты форматтау ─────────────────────────────────────────────────
  function formatTime(date: Date): string {
    return date.toLocaleTimeString(locale === "kk" ? "kk-KZ" : "ru-RU", {
      hour:   "2-digit",
      minute: "2-digit",
    });
  }

  // ── UI ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">

      {/* ═══ Чат панелі ═══════════════════════════════════════════════ */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "480px" }}>

          {/* Шапка */}
          <div className="bg-gradient-to-r from-[#0A1628] to-[#1E3A5F] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Аватар */}
              <div className="w-9 h-9 rounded-full bg-[#0EA5E9]/20 border-2 border-[#0EA5E9]/50 flex items-center justify-center text-lg">
                🤖
              </div>
              <div>
                <p className="text-white font-semibold text-sm">PeakRent Чат</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <p className="text-white/60 text-xs">
                    {isTyping
                      ? (locale === "kk" ? "Жауап береді..." : "Печатает...")
                      : (locale === "kk" ? "Онлайн" : "Онлайн")}
                  </p>
                </div>
              </div>
            </div>

            {/* Жабу батырмасы */}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          {/* Хабарлар тізімі */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {/* Бот аватары */}
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-1">
                    🤖
                  </div>
                )}

                <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  {/* Хабар көпіршігі */}
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#0EA5E9] text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm"
                  }`}>
                    {/* Жол үзілімдерін сақтаймыз */}
                    {msg.content.split("\n").map((line, i, lines) => (
                      <span key={i}>
                        {renderMessageLine(line, locale, msg.role === "user")}
                        {i < lines.length - 1 && <br />}
                      </span>
                    ))}
                  </div>

                  {/* Уақыт белгісі */}
                  <span className="text-xs text-gray-400 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {/* Бот теруде индикаторы */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0A1628] flex items-center justify-center text-sm">
                  🤖
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1 items-center">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Scroll нүктесі */}
            <div ref={messagesEndRef} />
          </div>

          {/* Жылдам жауаптар батырмалары */}
          {!hasUserMessages && quickReplies.length > 0 && !isTyping && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 flex-shrink-0">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(reply)}
                  className="text-xs bg-[#E0F2FE] text-[#0284C7] hover:bg-[#0EA5E9] hover:text-white px-3 py-1.5 rounded-full font-medium transition-colors border border-[#BAE6FD] hover:border-[#0EA5E9]"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Енгізу жолы */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                locale === "kk"
                  ? "Хабарлама жазыңыз..."
                  : locale === "en"
                  ? "Write a message..."
                  : "Напишите сообщение..."
              }
              disabled={isTyping}
              className="flex-1 bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] disabled:opacity-50 placeholder:text-gray-400"
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              className="w-9 h-9 bg-[#0EA5E9] hover:bg-[#0284C7] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              {/* Жіберу иконасы */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Аяқ жазуы */}
          <div className="px-3 pb-2 bg-white text-center">
            <p className="text-xs text-gray-400">
              PeakRent.kz
            </p>
          </div>
        </div>
      )}

      {/* ═══ Ашу/жабу батырмасы ═══════════════════════════════════════ */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative ${
          isOpen
            ? "bg-gray-700 hover:bg-gray-800"
            : "bg-gradient-to-br from-[#0A1628] to-[#0EA5E9] hover:shadow-[#0EA5E9]/30 hover:shadow-xl"
        }`}
        title={locale === "kk" ? "PeakRent чаты" : "Чат PeakRent"}
      >
        {/* Оқылмаған хабар белгісі */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}

        {/* Иконка: ашық → X, жабық → чат */}
        <span className="text-2xl transition-transform duration-200" style={{ transform: isOpen ? "rotate(0deg)" : "rotate(0deg)" }}>
          {isOpen ? "✕" : "💬"}
        </span>
      </button>

    </div>
  );
}
