import { useState, useRef, useEffect } from "react";
import {
  Plus, Search, Pin, MessageSquare, MoreHorizontal,
  Edit3, PinOff, Archive, PanelLeftClose, Settings, Users, Pencil, Trash2, Map,
} from "lucide-react";
import SolenqMark from "@/components/SolenqMark";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type VaultContact } from "@/lib/vault";
import { getStats, isStreakAtRisk, type Stats } from "@/lib/streak";
import { loadMaps, type SavedMap } from "@/lib/maps";

interface Chat {
  id: string;
  title: string;
  pinned: boolean;
  archived?: boolean;
  timestamp: Date;
}

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onTogglePin: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onArchiveChat: (id: string) => void;
  onOpenDNA: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  contacts: VaultContact[];
  matchedContactId: string | null;
  onOpenVault: (contact?: VaultContact) => void;
  onDeleteContact: (id: string) => void;
  onFocusInput: () => void;
  onOpenMapHistory: () => void;
}

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const steps = 30;
    const inc = target / steps;
    let current = 0;
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      current = Math.min(target, Math.round(inc * tick));
      setValue(current);
      if (current >= target) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, [target, duration]);
  return value;
}

export default function Sidebar({
  chats, activeChatId, onNewChat, onSelectChat, onTogglePin, onRenameChat,
  onArchiveChat, onOpenDNA, onOpenSettings, onClose,
  contacts, matchedContactId, onOpenVault, onDeleteContact, onFocusInput,
  onOpenMapHistory,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>(() => getStats());
  const [atRisk, setAtRisk] = useState(() => isStreakAtRisk());

  useEffect(() => {
    setStats(getStats());
    setAtRisk(isStreakAtRisk());
  }, []);

  const animStreak = useCountUp(stats.currentStreak);
  const animHandled = useCountUp(stats.totalHandled);
  const animRate = useCountUp(stats.responseRate);

  const visible = chats.filter((c) => !c.archived);
  const pinned = visible.filter((c) => c.pinned).filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const recent = visible.filter((c) => !c.pinned).filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <aside
      className="h-screen w-64 flex flex-col shrink-0 animate-slide-in-left"
      style={{
        background: "hsl(var(--surface))",
        boxShadow: "1px 0 0 rgba(255,255,255,0.03), 4px 0 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Logo area */}
      <div
        className="flex items-center justify-between gap-2.5 px-5 shrink-0"
        style={{ height: 56, paddingTop: 4 }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--primary) / 0.06))",
              border: "1px solid hsl(var(--primary) / 0.2)",
              boxShadow: "0 2px 8px hsl(var(--primary) / 0.12)",
            }}
          >
            <span style={{ color: "hsl(var(--primary))", opacity: 0.85 }}>
              <SolenqMark size={16} />
            </span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span
              className="font-bold tracking-tight"
              style={{ fontSize: 13, color: "hsl(var(--foreground))", letterSpacing: "0.06em" }}
            >
              SOLENQ
            </span>
            <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.55, fontStyle: "italic" }}>
              Intelligent communication.
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close sidebar"
          className="text-muted-foreground/40 hover:text-muted-foreground p-1.5 rounded-lg hover:bg-secondary/40 transition-all duration-200 active:scale-[0.96]"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Streak at-risk banner */}
      {atRisk && (
        <div className="px-4 pb-2">
          <div
            className="rounded-xl px-3 py-2.5 cursor-pointer transition-all"
            style={{
              background: "hsl(38 60% 50% / 0.06)",
              border: "1px solid hsl(38 60% 50% / 0.22)",
            }}
            onClick={() => onFocusInput()}
            onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(38 60% 50% / 0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(38 60% 50% / 0.06)"; }}
          >
            <p className="text-[11px] leading-snug" style={{ color: "hsl(38 60% 62%)" }}>
              Your streak is at risk today.
            </p>
          </div>
        </div>
      )}

      <div className="sidebar-sep mx-5 mb-4" />

      {/* Start fresh */}
      <div className="px-4 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 px-3.5 py-2.5 active:scale-[0.97]"
          style={{
            background: "hsl(var(--primary) / 0.07)",
            color: "hsl(var(--primary))",
            border: "1px solid hsl(var(--primary) / 0.15)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--primary) / 0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--primary) / 0.07)"; }}
        >
          <Plus className="h-4 w-4 shrink-0" />
          Start fresh
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg py-2 pl-8 pr-3 text-xs text-foreground/80 placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: 12,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.3)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
          />
        </div>
      </div>

      {/* Chat lists + People + Stats */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 space-y-5 min-h-0">
        {pinned.length > 0 && (
          <div>
            <p
              className="px-2 mb-2"
              style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))", opacity: 0.45, letterSpacing: "0.12em" }}
            >
              PINNED
            </p>
            {pinned.map((c) => (
              <ChatItem key={c.id} chat={c} active={c.id === activeChatId} editing={editingId === c.id}
                onSelect={() => onSelectChat(c.id)}
                onRename={(t) => { onRenameChat(c.id, t); setEditingId(null); }}
                onStartRename={() => setEditingId(c.id)}
                onCancelRename={() => setEditingId(null)}
                onPin={() => onTogglePin(c.id)}
                onArchive={() => onArchiveChat(c.id)}
              />
            ))}
          </div>
        )}

        <div>
          {recent.length === 0 && (
            <p
              className="px-2 py-5 leading-relaxed"
              style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", opacity: 0.38, fontStyle: "italic" }}
            >
              {search ? "No matching conversations." : "Your conversations will appear here."}
            </p>
          )}
          {recent.map((c) => (
            <ChatItem key={c.id} chat={c} active={c.id === activeChatId} editing={editingId === c.id}
              onSelect={() => onSelectChat(c.id)}
              onRename={(t) => { onRenameChat(c.id, t); setEditingId(null); }}
              onStartRename={() => setEditingId(c.id)}
              onCancelRename={() => setEditingId(null)}
              onPin={() => onTogglePin(c.id)}
              onArchive={() => onArchiveChat(c.id)}
            />
          ))}
          {chats.length > 0 && (
            <p
              className="px-2 pt-1"
              style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.3, fontStyle: "italic" }}
            >
              Saved locally · clears with browser data
            </p>
          )}
        </div>

        {/* ── People / Vault ──────────────────────────── */}
        <div>
          <div className="sidebar-sep mx-1 mb-4" />

          {contacts.length === 0 ? (
            <button
              onClick={() => onOpenVault()}
              style={{ fontSize: 11, color: "hsl(var(--primary))", opacity: 0.5, padding: "4px 8px", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
            >
              + Add someone you talk to often
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }} />
                  <p style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))", opacity: 0.45, letterSpacing: "0.12em" }}>
                    PEOPLE
                  </p>
                </div>
                <button
                  onClick={() => onOpenVault()}
                  className="text-[10px] transition-all rounded-md px-2 py-0.5"
                  style={{ color: "hsl(var(--primary))", opacity: 0.8, border: "1px solid hsl(var(--primary) / 0.2)", background: "hsl(var(--primary) / 0.05)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                >
                  + Save person
                </button>
              </div>
              {contacts.map((c) => {
                const isMatched = c.id === matchedContactId;
                return (
                  <div
                    key={c.id}
                    className="group flex items-start gap-2 rounded-xl px-3 py-2.5 mb-1 transition-all duration-200"
                    style={{
                      background: isMatched ? "hsl(var(--primary) / 0.07)" : "transparent",
                      boxShadow: isMatched ? "0 0 12px -4px hsl(var(--primary) / 0.25), inset 0 0 0 1px hsl(var(--primary) / 0.12)" : "none",
                      borderRadius: 12,
                    }}
                    onMouseEnter={(e) => { if (!isMatched) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { if (!isMatched) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{ fontSize: 12, fontWeight: 500, color: isMatched ? "hsl(var(--primary))" : "hsl(var(--foreground))", opacity: isMatched ? 0.9 : 0.75 }}
                      >
                        {c.name}
                      </p>
                      <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
                        {c.relationshipType}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => onOpenVault(c)}
                        className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteContact(c.id)}
                        className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Conversation Maps ────────────────────────── */}
        {(() => {
          const savedMaps = loadMaps().slice(0, 3);
          if (savedMaps.length === 0) return null;
          return (
            <div>
              <div className="sidebar-sep mx-1 mb-4" />
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Map className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }} />
                  <p style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))", opacity: 0.45, letterSpacing: "0.12em" }}>
                    MAPS
                  </p>
                </div>
                <button
                  onClick={onOpenMapHistory}
                  className="text-[10px] transition-all rounded-md px-2 py-0.5"
                  style={{ color: "hsl(var(--primary))", opacity: 0.8, border: "1px solid hsl(var(--primary) / 0.2)", background: "hsl(var(--primary) / 0.05)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
                >
                  View all
                </button>
              </div>
              {savedMaps.map((m) => {
                const d = new Date(m.date);
                const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <div
                    key={m.id}
                    className="rounded-xl px-3 py-2 mb-1.5"
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      border: "1px solid rgba(255,255,255,0.045)",
                    }}
                  >
                    <p style={{ fontSize: 11, color: "hsl(var(--foreground))", opacity: 0.65, fontWeight: 500 }}>
                      {m.answers.q1}
                    </p>
                    <p style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.38, marginTop: 2 }}>
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Your stats ──────────────────────────────── */}
        {stats.totalHandled >= 1 && (
          <div>
            <div className="sidebar-sep mx-1 mb-4" />
            <p
              className="px-2 mb-3"
              style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))", opacity: 0.45, letterSpacing: "0.12em" }}
            >
              YOUR STATS
            </p>
            <div
              className="rounded-xl p-3 space-y-2.5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <StatRow icon="🔥" label="Day streak" value={`${animStreak}`} accent />
              <StatRow icon="✅" label="Handled" value={`${animHandled}`} />
              <StatRow icon="📈" label="Response rate" value={`${animRate}%`} />
              <StatRow
                icon="⭐"
                label="Avg. outcome"
                value={stats.totalRated > 0 ? `${stats.averageScore}/3` : "—"}
              />
            </div>
          </div>
        )}
      </div>

      {/* Your voice + Settings */}
      <div className="px-3 pt-2 shrink-0">
        <div className="sidebar-sep mx-1 mb-3" />
        <button
          onClick={onOpenDNA}
          className="w-full flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 px-3 py-2.5 active:scale-[0.97]"
          style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; e.currentTarget.style.background = ""; }}
        >
          <Edit3 className="h-4 w-4 shrink-0" />
          Your voice
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 px-3 py-2.5 active:scale-[0.97]"
          style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; e.currentTarget.style.background = ""; }}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </button>
      </div>
    </aside>
  );
}

function StatRow({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>{label}</span>
      </div>
      <span
        className="font-semibold tabular-nums"
        style={{ fontSize: 12, color: accent ? "hsl(38 60% 62%)" : "hsl(var(--foreground))", opacity: accent ? 1 : 0.85 }}
      >
        {value}
      </span>
    </div>
  );
}

function ChatItem({
  chat, active, editing, onSelect, onRename, onStartRename, onCancelRename, onPin, onArchive,
}: {
  chat: Chat; active: boolean; editing: boolean;
  onSelect: () => void; onRename: (t: string) => void;
  onStartRename: () => void; onCancelRename: () => void;
  onPin: () => void; onArchive: () => void;
}) {
  const [val, setVal] = useState(chat.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setVal(chat.title); }, [chat.title]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.select(), 50); }, [editing]);

  const commit = () => {
    const t = val.trim();
    if (t && t !== chat.title) onRename(t);
    else onCancelRename();
  };

  return (
    <div
      className={cn(
        "w-full flex items-center gap-2 rounded-xl text-xs transition-all duration-150 group px-3 py-2.5 mb-0.5",
        active && "sidebar-chat-active"
      )}
      style={active ? {} : { color: "hsl(var(--muted-foreground))" }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
      {editing ? (
        <input
          ref={inputRef} value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") onCancelRename(); }}
          onBlur={commit}
          className="flex-1 rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--primary) / 0.35)", fontSize: 12 }}
        />
      ) : (
        <button onClick={onSelect} className="truncate flex-1 text-left">{chat.title}</button>
      )}
      {chat.pinned && !editing && (
        <Pin className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--primary))", opacity: 0.65 }} />
      )}
      {!editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground/50 hover:text-foreground p-0.5 rounded transition-opacity"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onStartRename}><Edit3 className="h-3.5 w-3.5 mr-2" />Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={onPin}>
              {chat.pinned ? <><PinOff className="h-3.5 w-3.5 mr-2" />Unpin</> : <><Pin className="h-3.5 w-3.5 mr-2" />Pin</>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive}><Archive className="h-3.5 w-3.5 mr-2" />Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
