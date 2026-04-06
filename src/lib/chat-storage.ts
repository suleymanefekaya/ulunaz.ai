export type ChatSession = { id: string; title: string; updatedAt: number };

const SESSIONS_KEY = "ulu-session-index";

export const messagesStorageKey = (id: string) => `ulu-chat:${id}`;

export function loadSessions(): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore quota */
  }
}

export function deleteSession(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(messagesStorageKey(id));
    const sessions = loadSessions().filter((s) => s.id !== id);
    saveSessions(sessions);
  } catch {
    /* ignore */
  }
}

export function loadMessagesJson(id: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(messagesStorageKey(id));
  } catch {
    return null;
  }
}

export function saveMessagesJson(id: string, json: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(messagesStorageKey(id), json);
  } catch {
    /* ignore */
  }
}

function firstUserSnippet(messages: unknown[]): string {
  for (const m of messages) {
    const msg = m as { role?: string; parts?: { type?: string; text?: string }[]; content?: string };
    if (msg.role !== "user") continue;
    if (typeof msg.content === "string" && msg.content.trim()) {
      const t = msg.content.trim();
      return t.length > 52 ? `${t.slice(0, 52)}…` : t;
    }
    if (Array.isArray(msg.parts)) {
      const t = msg.parts
        .filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("")
        .trim();
      if (t) return t.length > 52 ? `${t.slice(0, 52)}…` : t;
    }
  }
  return "Yeni sohbet";
}

export function sessionTitleFromMessages(messages: unknown[]): string {
  return firstUserSnippet(messages);
}
