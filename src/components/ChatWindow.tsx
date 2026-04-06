"use client";

import { useState, useRef, useEffect } from "react";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Send, Menu } from "lucide-react";
import { UluAvatar } from "./UluAvatar";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const PHOTO_MAP: Record<string, { src: string; alt: string }> = {
  "ulunaz-team": { src: "/ulunaz-team.jpg", alt: "Ulunaz Takımı: Fatmanur Sena Bülbül, Salih Buğra Bülbül, Süleyman Efe Kaya" },
};

function renderMessageContent(text: string) {
  const regex = /\[FOTO:([\w-]+)\]/g;
  const parts: (string | { photo: string })[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push({ photo: match[1] });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));

  return parts.map((part, i) => {
    if (typeof part === "string") return <span key={i}>{part}</span>;
    const info = PHOTO_MAP[part.photo];
    if (!info) return null;
    return (
      <Image
        key={i}
        src={info.src}
        alt={info.alt}
        width={400}
        height={300}
        className="rounded-2xl mt-3 mb-1 shadow-md border border-sky-200"
        style={{ maxWidth: "100%", height: "auto" }}
      />
    );
  });
}

function GeminiErrorExplanation({ message }: { message: string }) {
  const limitZero = /limit:\s*0\b/i.test(message);
  const rateLimited =
    /429|Too Many Requests|quota exceeded/i.test(message) && !limitZero;

  if (limitZero) {
    return (
      <div className="mt-2 space-y-2 text-xs leading-relaxed opacity-95">
        <p>
          Google yanıtında <span className="font-mono rounded bg-amber-100/80 px-1">limit: 0</span>{" "}
          görünüyor. Bu genelde günlük kotanın dolması değil; API anahtarının bağlı olduğu Google
          Cloud projesinde Gemini için kullanılabilir kotanın henüz tanımlı olmadığı anlamına gelir
          (API kapalı, proje yeni veya faturalandırma / ücretsiz katman atanmamış olabilir).
        </p>
        <p className="font-medium">Ne yapmalı?</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <a
              className="text-sky-800 underline hover:text-sky-950"
              href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>
            ’da aynı projede <strong>Generative Language API</strong> açık olsun.
          </li>
          <li>
            Mümkünse{" "}
            <a
              className="text-sky-800 underline hover:text-sky-950"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google AI Studio
            </a>
            ’dan yeni bir API anahtarı oluşturup <code className="rounded bg-amber-100/80 px-1">.env.local</code> içine yazın; sunucuyu yeniden başlatın.
          </li>
          <li>
            <a
              className="text-sky-800 underline hover:text-sky-950"
              href="https://ai.google.dev/gemini-api/docs/rate-limits"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gemini kota ve hız limitleri (resmi dokümantasyon)
            </a>
            {" "}
            sayfasını okuyun; ardından Google Cloud Console’daki Quotas (kotalar) ekranından projenizi
            doğrulayın.
          </li>
        </ul>
      </div>
    );
  }

  if (rateLimited) {
    return (
      <p className="mt-2 text-xs leading-relaxed opacity-90">
        İstek kotası veya dakikalık hız sınırı aşıldı. Bir süre bekleyip tekrar deneyin. Sorun sürerse
        aynı projede faturalandırmayı veya farklı bir Gemini modeli (
        <code className="rounded bg-amber-100/80 px-1">.env.local</code> içinde{" "}
        <span className="font-mono">GEMINI_MODEL=gemini-2.5-flash</span> gibi) deneyin.
      </p>
    );
  }

  const short =
    message.length > 600 ? `${message.slice(0, 600)}…` : message;
  return (
    <p className="mt-2 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed opacity-90">
      {short}
    </p>
  );
}

type ChatWindowProps = Pick<
  UseChatHelpers<UIMessage>,
  "messages" | "status" | "sendMessage" | "error" | "clearError"
> & {
  onOpenSidebar: () => void;
};

export function ChatWindow({
  messages,
  status,
  sendMessage,
  error,
  clearError,
  onOpenSidebar,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (sendMessage) {
      sendMessage({ text: input });
    }
    setInput("");
  };

  // Determine avatar state based on user interaction
  const avatarState = isLoading ? "generating" : input.trim().length > 0 ? "typing" : "idle";

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-sky-100 relative text-black">
      <header className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-sky-300/80 bg-sky-200/40 shrink-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-black hover:bg-white/60 transition-colors"
          aria-label="Sohbet listesini aç"
        >
          <Menu size={22} />
        </button>
        <span className="font-extrabold text-lg">ulunaz.ai</span>
      </header>
      <div className="flex-1 overflow-y-auto custom-scrollbar md:px-8 px-4 relative pb-32 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-100 pt-20">
            <UluAvatar size="lg" state={avatarState} />
            <h2 className="text-3xl font-extrabold mt-8 text-black drop-shadow-md">Hav Hav! Merhaba! 🐾</h2>
            <p className="text-black font-medium mt-3 text-center max-w-md text-lg">
              Ben <span className="font-extrabold text-ulu-orange drop-shadow-sm">Ulunaz</span>! 🐾 Kampüsün akıllı köpeğiyim. Sana nasıl pati atabilirim?
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full max-w-2xl">
              {["YBS Ders Programı Nerede?", "Danışman Hocamı Bul", "Yapay Zeka Kulübüne Katıl", "Akademik Takvim"].map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => {
                      setInput(s);
                      if (sendMessage) sendMessage({ text: s });
                      setInput("");
                  }}
                  className="p-5 bg-white/80 backdrop-blur-xl border border-sky-300 rounded-2xl text-sm font-bold text-black hover:bg-sky-200 hover:shadow-lg transition-all duration-300 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full pt-8 pb-4 space-y-8">
            <AnimatePresence initial={false}>
              {messages.map((msg: any) => (
                <motion.div
                  key={msg.id || Math.random().toString()}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={cn("flex w-full group", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 mr-4 mt-1 drop-shadow-md">
                      <UluAvatar size="sm" state="idle" />
                    </div>
                  )}
                  <div 
                    className={cn(
                      "px-6 py-4 rounded-3xl max-w-[85%] whitespace-pre-wrap transition-shadow hover:shadow-md", 
                      msg.role === "user" 
                        ? "bg-slate-800 text-white ml-auto rounded-tr-sm shadow-xl font-medium" 
                        : "bg-white backdrop-blur-2xl text-black rounded-tl-sm border border-sky-300 shadow-lg font-medium leading-relaxed"
                    )}
                  >
                    {(() => {
                      const text = msg.content ? msg.content : (msg.parts ? msg.parts.map((p: any) => p.text || "").join("") : "...");
                      if (msg.role === "assistant" && typeof text === "string" && text.includes("[FOTO:")) {
                        return renderMessageContent(text);
                      }
                      return text;
                    })()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex justify-start items-center gap-4"
              >
                <div className="drop-shadow-md">
                   <UluAvatar size="sm" state="generating" />
                </div>
                <div className="flex space-x-1.5 p-4 bg-white backdrop-blur-2xl shadow-lg rounded-3xl rounded-tl-sm border border-sky-300">
                  <div className="w-2.5 h-2.5 bg-ulu-orange rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-ulu-orange rounded-full animate-bounce shadow-sm" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-ulu-orange rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-sky-100 via-sky-100/90 to-transparent">
        <div className="max-w-3xl mx-auto">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
            >
              <p className="font-semibold">Bir şeyler ters gitti</p>
              <GeminiErrorExplanation message={error.message} />
              <button
                type="button"
                onClick={() => clearError()}
                className="mt-2 text-xs font-bold text-amber-900 underline hover:no-underline"
              >
                Kapat
              </button>
            </div>
          )}
          <form 
            onSubmit={handleSubmit}
            className="flex items-end gap-3 bg-white backdrop-blur-3xl border border-sky-300 rounded-3xl p-3 shadow-2xl relative focus-within:ring-4 focus-within:ring-primary/20 transition-all duration-300"
          >
            <textarea
              name="prompt"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ulunaz'a sorularını sor (Hav!)..."
              className="w-full max-h-32 min-h-[44px] bg-transparent resize-none py-3 px-2 outline-none text-black font-semibold custom-scrollbar text-[15px] placeholder:text-slate-500"
              rows={1}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-3.5 rounded-full flex-shrink-0 transition-all duration-300 shadow-md",
                input.trim() && !isLoading 
                  ? "bg-sky-500 text-white hover:shadow-xl hover:scale-105" 
                  : "bg-sky-100 text-sky-300 cursor-not-allowed shadow-none"
              )}
            >
              <Send size={20} className={input.trim() && !isLoading ? "translate-x-0.5 -translate-y-0.5" : ""} />
            </button>
          </form>
          <div className="text-center mt-3 drop-shadow-sm">
            <span className="text-[11px] font-medium text-black/60">
              Ulunaz asistan zaman zaman hatalı havlayabilir (bilgi verebilir). Önemli konularda hocalarınıza teyit ettiriniz. 🐾
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
