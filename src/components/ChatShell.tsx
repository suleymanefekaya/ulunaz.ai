"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { Sidebar } from "./Sidebar";
import { ChatWindow } from "./ChatWindow";
import {
  loadSessions,
  saveSessions,
  saveMessagesJson,
  loadMessagesJson,
  deleteSession,
  sessionTitleFromMessages,
  type ChatSession,
} from "@/lib/chat-storage";

const PENDING_ID = "__ulu_pending__";

export function ChatShell() {
  const [activeChatId, setActiveChatId] = useState(PENDING_ID);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const initialMessages = useMemo((): UIMessage[] => {
    if (activeChatId === PENDING_ID || typeof window === "undefined") return [];
    const raw = loadMessagesJson(activeChatId);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as UIMessage[];
    } catch {
      return [];
    }
  }, [activeChatId]);

  const { messages, status, sendMessage, error, clearError } = useChat({
    id: activeChatId === PENDING_ID ? PENDING_ID : activeChatId,
    messages: initialMessages,
  });

  useLayoutEffect(() => {
    const list = loadSessions();
    let next = list;
    if (!next.length) {
      const id = crypto.randomUUID();
      next = [{ id, title: "Yeni sohbet", updatedAt: Date.now() }];
      saveSessions(next);
    }
    const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(sorted);
    setActiveChatId(sorted[0].id);
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeChatId === PENDING_ID) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveMessagesJson(activeChatId, JSON.stringify(messages));
      const title = sessionTitleFromMessages(messages as unknown[]);
      setSessions((prev) => {
        const row: ChatSession = {
          id: activeChatId,
          title,
          updatedAt: Date.now(),
        };
        if (!prev.some((s) => s.id === activeChatId)) {
          return [row, ...prev].sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return prev
          .map((s) => (s.id === activeChatId ? row : s))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      });
    }, 450);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [messages, activeChatId]);

  useEffect(() => {
    if (activeChatId === PENDING_ID) return;
    saveSessions(sessions);
  }, [sessions, activeChatId]);

  const handleNewChat = () => {
    const id = crypto.randomUUID();
    const row: ChatSession = { id, title: "Yeni sohbet", updatedAt: Date.now() };
    setSessions((prev) => {
      const next = [row, ...prev.filter((s) => s.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessions(next);
      return next;
    });
    setActiveChatId(id);
    setMobileSidebar(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveChatId(id);
    setMobileSidebar(false);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const newId = crypto.randomUUID();
        const row: ChatSession = { id: newId, title: "Yeni sohbet", updatedAt: Date.now() };
        saveSessions([row]);
        setActiveChatId(newId);
        return [row];
      }
      if (id === activeChatId) {
        setActiveChatId(next[0].id);
      }
      return next;
    });
  };

  return (
    <>
      {mobileSidebar && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/35 md:hidden"
          onClick={() => setMobileSidebar(false)}
        />
      )}

      <Sidebar
        sessions={sessions}
        activeChatId={activeChatId === PENDING_ID ? undefined : activeChatId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setMobileSidebar(false);
        }}
        onMenuClick={() => setMobileSidebar((o) => !o)}
        mobileOpen={mobileSidebar}
      />

      <ChatWindow
        messages={messages}
        status={status}
        sendMessage={sendMessage}
        error={error}
        clearError={clearError}
        onOpenSidebar={() => setMobileSidebar(true)}
      />

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Kapat"
            onClick={() => setSettingsOpen(false)}
          />
          <div
            role="dialog"
            aria-labelledby="settings-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-sky-300 bg-white p-6 text-black shadow-2xl"
          >
            <h2 id="settings-title" className="text-lg font-extrabold">
              Profil ve Ayarlar
            </h2>

            <div className="mt-4 flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-200">
              <div className="w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold text-lg ring-2 ring-white shadow-md shrink-0">
                EK
              </div>
              <div>
                <p className="font-bold text-base">Efecan Kaya</p>
                <p className="text-sm text-black/60">Öğrenci</p>
                <p className="text-xs text-black/40 mt-0.5">İnegöl İşletme Fakültesi</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-bold text-black/70">Hakkında</h3>
              <ul className="list-disc space-y-2 pl-5 text-sm text-black/85">
                <li>Sohbet geçmişi yalnızca bu tarayıcıda saklanır; özel bilgi paylaşırken dikkatli olun.</li>
                <li>&quot;Yeni sohbet&quot; ile temiz bir konuşma başlatabilirsiniz.</li>
                <li>Geçmişten bir başlığa tıklayarak o sohbete dönebilirsiniz.</li>
              </ul>
            </div>

            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-bold text-black/70">Yapımcılar</h3>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm">
                <p className="font-bold">Ulunaz Takımı</p>
                <p className="text-black/70 mt-1">Kaptan: Fatmanur Sena Bülbül</p>
                <p className="text-black/70">Salih Buğra Bülbül</p>
                <p className="text-black/70">Süleyman Efe Kaya</p>
                <p className="text-xs text-black/50 mt-2">UYBİST AR-GE Komitesi Hackathon Projesi</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="mt-6 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  );
}
