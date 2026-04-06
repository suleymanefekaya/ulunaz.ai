import { MessageSquare, Plus, Settings, Menu, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/lib/chat-storage";

type SidebarProps = {
  className?: string;
  sessions: ChatSession[];
  activeChatId?: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onMenuClick: () => void;
  mobileOpen: boolean;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function bucketLabel(updatedAt: number): "Bugün" | "Dün" | "Önceki günler" {
  const t = startOfDay(new Date());
  const y = t - 86400000;
  const u = startOfDay(new Date(updatedAt));
  if (u >= t) return "Bugün";
  if (u >= y) return "Dün";
  return "Önceki günler";
}

function groupSessions(sessions: ChatSession[]) {
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const buckets: Record<string, ChatSession[]> = {
    Bugün: [],
    Dün: [],
    "Önceki günler": [],
  };
  for (const s of sorted) {
    buckets[bucketLabel(s.updatedAt)].push(s);
  }
  return [
    { label: "Bugün" as const, items: buckets["Bugün"] },
    { label: "Dün" as const, items: buckets["Dün"] },
    { label: "Önceki günler" as const, items: buckets["Önceki günler"] },
  ].filter((g) => g.items.length > 0);
}

export function Sidebar({
  className,
  sessions,
  activeChatId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings,
  onMenuClick,
  mobileOpen,
}: SidebarProps) {
  const groups = groupSessions(sessions);

  return (
    <div
      className={cn(
        "flex-col w-64 shrink-0 bg-sky-200/50 backdrop-blur-3xl border-r border-sky-300/80 h-full shadow-2xl overflow-hidden",
        "md:flex md:relative md:z-10",
        mobileOpen ? "flex fixed inset-y-0 left-0 z-50 max-w-[85vw]" : "hidden",
        className,
      )}
    >
      <div className="p-5 flex items-center justify-between gap-2 border-b border-sky-300/80">
        <h1 className="font-extrabold text-2xl text-black drop-shadow-sm truncate">
          ulunaz.ai
        </h1>
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden shrink-0 text-black hover:text-sky-800 transition-colors p-1.5 rounded-lg hover:bg-sky-300/50"
          aria-label="Menüyü kapat"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0">
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2 text-sm font-bold text-black bg-white border border-sky-300/80 w-full p-3 rounded-xl hover:shadow-lg hover:shadow-sky-500/10 hover:border-sky-400 transition-all duration-300 shadow-sm mb-6"
        >
          <Plus size={18} className="text-primary" />
          <span>Yeni Sohbet</span>
        </button>

        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              <h3 className="text-xs font-extrabold text-black uppercase tracking-wider mb-3 px-2 text-shadow-sm">
                {label}
              </h3>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-1 w-full rounded-xl text-sm md:text-[13px] font-semibold text-black transition-all group/row",
                      item.id === activeChatId
                        ? "bg-white/95 border border-sky-400 shadow-md"
                        : "hover:bg-white/90",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSession(item.id)}
                      className="flex flex-col gap-0.5 flex-1 min-w-0 text-left p-2.5 hover:translate-x-1 transition-all"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <MessageSquare
                          size={16}
                          className="text-sky-600 group-hover/row:text-primary transition-colors shrink-0"
                        />
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="pl-7 text-[10px] font-medium text-black/50">
                        {new Date(item.updatedAt).toLocaleString("tr-TR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(item.id);
                      }}
                      className="shrink-0 p-1.5 mr-1.5 rounded-lg text-black/30 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover/row:opacity-100"
                      aria-label="Sohbeti sil"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-sky-300 shrink-0">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/80 transition-all text-sm text-black"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-white/50 shadow-md">
              EK
            </div>
            <span className="font-bold drop-shadow-sm">Efecan Kaya</span>
          </div>
          <Settings size={18} className="text-sky-600 hover:text-black transition-colors" />
        </button>
      </div>
    </div>
  );
}
