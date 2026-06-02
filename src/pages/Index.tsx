import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, PanelLeft, Sun, Moon, Bell, X, Home, Users, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import Onboarding from "@/components/Onboarding";
import { type Mode } from "@/components/ModeToggle";
import ResultCard, { type AIResult } from "@/components/ResultCard";
import DNAPanel from "@/components/DNAPanel";
import FollowUpCard, { getDueReminders, clearReminder, saveReminder, type ReminderRecord } from "@/components/FollowUpCard";
import SettingsPanel from "@/components/SettingsPanel";
import PostActionPanel from "@/components/PostActionPanel";
import SmartInputControls from "@/components/SmartInputControls";
import IntentChips, { type Intent, intentToTone } from "@/components/IntentChips";
import MoodCheckIn from "@/components/MoodCheckIn";
import ResponseSimulator from "@/components/ResponseSimulator";
import VaultPanel from "@/components/VaultPanel";
import ConversationMap from "@/components/ConversationMap";
import MapHistoryPanel from "@/components/MapHistoryPanel";
import SolenqMark from "@/components/SolenqMark";
import { loadContacts, deleteContact, findMatchingContact, type VaultContact } from "@/lib/vault";
import { saveOutcome, recordHandled, recordRated } from "@/lib/streak";
import { groqJSON } from "@/lib/groq";
import { useTheme } from "@/hooks/useTheme";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  timestamp: Date;
  situation: string;
  result: AIResult | null;
  mode: Mode;
}

const LOADING_MESSAGES = [
  "Reading the situation…",
  "Finding the right approach…",
  "Crafting your response…",
];

const ROTATING_PLACEHOLDERS = [
  "What's the situation?",
  "Who are you trying to reach?",
  "What's been left unsaid?",
  "What do you wish you could say?",
  "What happened that you need to address?",
  "Who needs to hear from you today?",
];

const WARMTH_LINES = [
  "Most people rewrite difficult messages several times before sending.",
  "You don't need to sound perfect to sound clear.",
  "Clarity usually works better than overexplaining.",
  "Difficult conversations feel easier when the next step is clear.",
  "You can stay calm without sounding passive.",
  "The right words exist. Let's find them together.",
];

const STATIC_CHIPS = [
  "Follow up without pressure",
  "Say no clearly",
  "Keep this professional",
  "Respond without escalating",
  "Sound confident, not cold",
];

const EMOTIONAL_FEEDBACK_RULES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /(angry|furious|fed up|outraged|done with|sick of|can't believe)/, message: "This sounds emotionally loaded — Solenq can help you channel that clearly." },
  { pattern: /(desperate|begging|please.*help|hate to ask|sorry to bother)/, message: "You don't need to apologize here. Clarity is enough." },
  { pattern: /(invoice|payment|paid|owes?|unpaid|late payment)/, message: "Payment situations are more common than they feel. You can address this calmly." },
  { pattern: /(ignor|ghost|no reply|no response|silent|disappeared)/, message: "Silence is frustrating. A clear, brief message usually works best." },
  { pattern: /(awkward|weird|uncomfortable|don't know what to say)/, message: "Awkward conversations often feel bigger in the moment than they are." },
  { pattern: /(say no|turn down|decline|refuse|can't take on)/, message: "Saying no clearly and kindly is a skill. Let's frame it right." },
  { pattern: /(follow up|following up|check in|circle back|hasn't replied)/, message: "Following up thoughtfully shows you're professional, not pushy." },
  { pattern: /(boss|manager|supervisor|my boss|my manager)/, message: "Conversations upward require care — tone matters as much as content." },
  { pattern: /(scope|extra work|more work|out of scope|wasn't included)/, message: "Scope conversations are about clarity, not conflict." },
  { pattern: /(client|customer)/, message: "Keeping this clear and calm protects the relationship." },
];

function getEmotionalFeedback(text: string): string | null {
  if (text.trim().length < 20) return null;
  for (const { pattern, message } of EMOTIONAL_FEEDBACK_RULES) {
    if (pattern.test(text.toLowerCase())) return message;
  }
  if (text.trim().length > 70) {
    return "You're describing this clearly. Let's shape the right response.";
  }
  return null;
}

const DEFAULT_MODE: Mode = "relationship";

function getDynamicChips(situation: string, mode: Mode): { label: string; append: string }[] {
  const s = situation.toLowerCase();
  const chips: { label: string; append: string }[] = [];
  if (!s) return chips;
  if (mode === "paid") {
    if (!/(by|deadline|friday|monday|tomorrow|today|days?)/.test(s)) {
      chips.push({ label: "Set a deadline", append: " I want to set a clear deadline." });
    }
    if (/(scope|extra|more work|additional)/.test(s)) {
      chips.push({ label: "Pause until resolved", append: " I'm ready to pause work until this is settled." });
    }
    if (/(soon|later|whenever|no reply|not replying|ignored)/.test(s)) {
      chips.push({ label: "Ask for confirmation today", append: " I need confirmation today." });
    }
  } else {
    if (/(no reply|not replying|silent|ignored|ghost)/.test(s)) {
      chips.push({ label: "Nudge gently", append: " I want to nudge them without pressure." });
    }
    if (/(scope|extra|more work)/.test(s)) {
      chips.push({ label: "Address it kindly", append: " I'd like to address this kindly." });
    }
    if (!/(when|date|by)/.test(s)) {
      chips.push({ label: "Suggest a soft timeline", append: " A rough timeline would help." });
    }
  }
  return chips.slice(0, 3);
}

const Index = () => {
  const { settings, update: updateSettings } = useSettings();
  const [mode, setMode] = useState<Mode>(DEFAULT_MODE);
  const [situation, setSituation] = useState("");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState<"softer" | "stronger" | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<AIResult | null>(null);
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const raw = localStorage.getItem("solenq-chats");
      if (!raw) return [];
      return (JSON.parse(raw) as Chat[]).map(c => ({ ...c, timestamp: new Date(c.timestamp) }));
    } catch { return []; }
  });
  const [pastedThread, setPastedThread] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dnaOpen, setDnaOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [onboarded] = useState(() => localStorage.getItem("solenq-onboarded") === "true");
  const [showOnboarding, setShowOnboarding] = useState(!onboarded);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapHistoryOpen, setMapHistoryOpen] = useState(false);
  const [warmthIdx, setWarmthIdx] = useState(0);
  const [warmthKey, setWarmthKey] = useState(0);
  const [emotionalFeedback, setEmotionalFeedback] = useState<string | null>(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [dueReminder, setDueReminder] = useState<ReminderRecord | null>(null);
  const [postActionOpen, setPostActionOpen] = useState(false);
  const [intent, setIntent] = useState<Intent>("Balanced");
  const [checkInStep, setCheckInStep] = useState<"mood" | "goal" | "confirming" | null>(null);
  const [pendingMood, setPendingMood] = useState<string | null>(null);
  const [pendingGoal, setPendingGoal] = useState<string | null>(null);
  const [contacts, setContacts] = useState<VaultContact[]>(() => loadContacts());
  const [vaultOpen, setVaultOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<VaultContact | null>(null);

  useEffect(() => {
    if (settings?.doNotStore) return;
    try {
      localStorage.setItem("solenq-chats", JSON.stringify(
        chats.slice(0, 30).map(c => ({ ...c, result: null }))
      ));
    } catch {}
  }, [chats, settings?.doNotStore]);

  const { theme, toggle: toggleTheme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  useEffect(() => { setMode(settings.defaultMode); }, [settings.defaultMode]);

  useEffect(() => {
    if (!loading) return;
    setLoadingMsg(LOADING_MESSAGES[0]);
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 1300);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (situation || inputFocused) return;
    const iv = setInterval(() => setPlaceholderIdx((i) => (i + 1) % ROTATING_PLACEHOLDERS.length), 5000);
    return () => clearInterval(iv);
  }, [situation, inputFocused]);

  useEffect(() => {
    if (result || loading) return;
    const iv = setInterval(() => {
      setWarmthIdx((i) => (i + 1) % WARMTH_LINES.length);
      setWarmthKey((k) => k + 1);
    }, 12000);
    return () => clearInterval(iv);
  }, [result, loading]);

  useEffect(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (!situation.trim()) {
      setFeedbackVisible(false);
      setTimeout(() => setEmotionalFeedback(null), 600);
      return;
    }
    feedbackTimerRef.current = setTimeout(() => {
      const fb = getEmotionalFeedback(situation);
      if (fb) {
        setEmotionalFeedback(fb);
        setTimeout(() => setFeedbackVisible(true), 30);
      } else {
        setFeedbackVisible(false);
        setTimeout(() => setEmotionalFeedback(null), 600);
      }
    }, 700);
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); };
  }, [situation]);

  useEffect(() => {
    if (!settings.followUpEnabled) return;
    const due = getDueReminders();
    if (due.length > 0) setDueReminder(due[0]);
  }, [settings.followUpEnabled]);

  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  useEffect(() => {
    if (mapOpen && mapRef.current) {
      setTimeout(() => mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [mapOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (situation.trim() && !loading) handleGenerate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleNewChat();
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
      if (e.key === "Escape") {
        if (result) {
          setResult(null);
          setSituation("");
          setTimeout(() => textareaRef.current?.focus(), 100);
        }
        if (mapOpen) setMapOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setSidebarOpen(v => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && result && !window.getSelection()?.toString()) {
        e.preventDefault();
        if (result.message) {
          navigator.clipboard.writeText(result.message);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [situation, loading, result, mapOpen]);

  const dynamicChips = useMemo(() => getDynamicChips(situation, mode), [situation, mode]);

  const detectedMode = useMemo(() => {
    const s = situation.toLowerCase();
    if (/(pay|paid|invoice|owed|owe|money|fee|charge|bill|unpaid|overdue)/.test(s)) return "payment";
    return "relationship";
  }, [situation]);

  const matchedContact = useMemo(() => findMatchingContact(situation), [situation]);

  const generate = async (situationText: string, currentMode: Mode, level?: number, intentOverride?: Intent, mood?: string, goal?: string) => {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setPostActionOpen(false);
    setCheckInStep(null);
    const startedAt = performance.now();
    const timeout = setTimeout(() => {
      setLoading(false);
      toast({ title: "That took too long", description: "Please try again.", variant: "destructive" });
    }, 30000);

    const effectiveTone = intentToTone(intentOverride ?? intent);
    const contactContext = findMatchingContact(situationText)?.notes;

    const callSupabase = async () => {
      const { data, error } = await supabase.functions.invoke("generate-response", {
        body: { situation: situationText, mode: currentMode, variant: "default", level, tone: effectiveTone, mood, goal, contactContext },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AIResult;
    };

    const callGroqFallback = async () => {
      const modeLabel = currentMode === "paid" ? "Get Paid Fast (direct, firm, professional)" : "Stay Polite (warm, relationship-first)";
      const prompt = `You are a communication expert. Given this situation, write the perfect message.

Situation: ${situationText}
Mode: ${modeLabel}
Tone: ${effectiveTone}
${mood ? `User's mood: ${mood}` : ""}
${goal ? `User's goal: ${goal}` : ""}

Return ONLY a valid JSON object with no markdown:
{"message":"The exact message to send (1-3 lines, natural and human)","analysis":"1-2 sentence read on what's happening","advice":"One specific action with timing","why_it_works":"One line on the psychological lever","confidence":"High","expected_outcome":"What they'll probably do after reading this"}`;
      return await groqJSON<AIResult>(prompt);
    };

    try {
      let res: AIResult;
      try {
        res = await callSupabase();
      } catch {
        toast({ title: "Switching to backup AI…", description: "One moment." });
        await new Promise((r) => setTimeout(r, 400));
        try {
          res = await callSupabase();
        } catch {
          res = await callGroqFallback();
        }
      }
      setResult(res);
      recordHandled();

      if (!settings.doNotStore) {
        const chatId = activeChatId || crypto.randomUUID();
        setChats((prev) => {
          const existing = prev.find((c) => c.id === chatId);
          if (existing) {
            return prev.map((c) => c.id === chatId
              ? { ...c, result: res, situation: situationText, mode: currentMode }
              : c
            );
          }
          return [
            { id: chatId, title: situationText.slice(0, 40), pinned: false, archived: false, timestamp: new Date(), situation: situationText, result: res, mode: currentMode },
            ...prev,
          ];
        });
        setActiveChatId(chatId);
      }
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!situation.trim()) {
      toast({ title: "Describe your situation first", variant: "destructive" });
      return;
    }
    if (!result) {
      setCheckInStep("mood");
      return;
    }
    await generate(situation, mode);
  };

  const handleCheckInComplete = async (mood: string, goal: string) => {
    setPendingMood(mood);
    setPendingGoal(goal);
    setCheckInStep("confirming");
    await new Promise((r) => setTimeout(r, 950));
    await generate(situation, mode, undefined, undefined, mood, goal);
  };

  const handleCheckInSkip = async () => {
    setCheckInStep(null);
    await generate(situation, mode);
  };

  const handleRefine = async (variant: "softer" | "stronger") => {
    if (!result || !situation.trim()) return;
    setRefining(variant);
    const timeout = setTimeout(() => {
      setRefining(null);
      toast({ title: "That took too long", description: "Please try again.", variant: "destructive" });
    }, 30000);
    try {
      const { data, error } = await supabase.functions.invoke("generate-response", {
        body: { situation, mode, variant, previousMessage: result.message, level: result.level, tone: intentToTone(intent) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as AIResult);
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      clearTimeout(timeout);
      setRefining(null);
    }
  };

  const handleNewChat = useCallback(() => {
    setSituation("");
    setResult(null);
    setLoading(false);
    setRefining(null);
    setMode(settings.defaultMode);
    setIntent("Balanced");
    setActiveChatId(null);
    setEmotionalFeedback(null);
    setFeedbackVisible(false);
    setCheckInStep(null);
    setPendingMood(null);
    setPendingGoal(null);
    setPastedThread(false);
    setShowSimulator(false);
    setTimeout(() => textareaRef.current?.focus(), 200);
  }, [settings.defaultMode]);

  const handleSelectChat = useCallback((id: string) => {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    setActiveChatId(id);
    setSituation(chat.situation);
    setResult(chat.result);
    setMode(chat.mode);
    setLoading(false);
    setRefining(null);
  }, [chats]);

  const handleTogglePin = useCallback((id: string) => {
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }, []);

  const handleRenameChat = useCallback((id: string, title: string) => {
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, title } : c));
  }, []);

  const handleArchiveChat = useCallback((id: string) => {
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, archived: true, pinned: false } : c));
    if (activeChatId === id) handleNewChat();
    toast({ title: "Conversation archived" });
  }, [activeChatId, handleNewChat, toast]);

  const handleEditRetry = () => {
    inputRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => textareaRef.current?.focus(), 300);
  };

  const handleChip = (text: string) => {
    setSituation(text + ". ");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleAppendChip = (append: string) => {
    setSituation((s) => (s.trim().endsWith(".") ? s + append : s + "." + append));
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (situation.trim() && !loading) handleGenerate();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (situation.trim() && !loading) handleGenerate();
    }
  };

  const handleFollowUpReminder = async () => {
    if (!dueReminder) return;
    const nextLevel = Math.min(5, (dueReminder.level || 2) + 1);
    setSituation(dueReminder.situation);
    setMode(dueReminder.mode);
    clearReminder(dueReminder.id);
    setDueReminder(null);
    await generate(dueReminder.situation, dueReminder.mode, nextLevel);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background" data-mode={mode}>
      {showOnboarding && (
        <Onboarding
          onComplete={(prefill) => {
            setShowOnboarding(false);
            if (prefill) {
              setSituation(prefill + ". ");
            }
            setTimeout(() => textareaRef.current?.focus(), 550);
          }}
        />
      )}
      {sidebarOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="solenq-sidebar-overlay md:relative md:h-full md:flex md:flex-col">
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onNewChat={handleNewChat}
              onSelectChat={handleSelectChat}
              onTogglePin={handleTogglePin}
              onRenameChat={handleRenameChat}
              onArchiveChat={handleArchiveChat}
              onOpenDNA={() => setDnaOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onClose={() => setSidebarOpen(false)}
              contacts={contacts}
              matchedContactId={matchedContact?.id}
              onOpenVault={(contact) => { setEditingContact(contact ?? null); setVaultOpen(true); }}
              onDeleteContact={(id) => {
                deleteContact(id);
                setContacts(loadContacts());
              }}
              onFocusInput={() => {
                setSidebarOpen(false);
                setTimeout(() => textareaRef.current?.focus(), 250);
              }}
              onOpenMapHistory={() => { setMapHistoryOpen(true); setSidebarOpen(false); }}
            />
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-14 shrink-0 gap-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary/60 transition-colors active:scale-[0.97]"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            {!sidebarOpen && (
              <span className="text-sm font-bold tracking-tight" style={{ color: "hsl(var(--primary))", opacity: 0.85 }}>
                SOLENQ
              </span>
            )}
            <p className="text-xs text-muted-foreground/50 truncate max-w-sm">
              {activeChatId && situation ? situation.slice(0, 60) + (situation.length > 60 ? "…" : "") : ""}
            </p>
          </div>
          <div className="flex items-center gap-2" />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

            {/* Due reminder */}
            {dueReminder && (
              <div
                className="rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up"
                style={{
                  border: "1px solid hsl(var(--primary) / 0.22)",
                  background: "hsl(var(--primary) / 0.04)",
                }}
              >
                <Bell className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Time to follow up?</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    "{dueReminder.situation.slice(0, 80)}{dueReminder.situation.length > 80 ? "…" : ""}"
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleFollowUpReminder}
                  className="rounded-xl text-xs h-8 btn-solenq active:scale-[0.97] border-0"
                >
                  Navigate this
                </Button>
                <button
                  onClick={() => { clearReminder(dueReminder.id); setDueReminder(null); }}
                  className="text-muted-foreground/40 hover:text-foreground p-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* ── Hero ─────────────────────────────────────────────── */}
            {!result && !loading && !mapOpen && (
              <div className="text-center pt-6 pb-2 animate-fade-in atmos-hero space-y-6">
                <div
                  className="hero-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(200,169,107,0.07)",
                    color: "#C8A96B",
                    border: "1px solid rgba(200,169,107,0.25)",
                    letterSpacing: "0.2em",
                    fontSize: "10px",
                  }}
                >
                  <SolenqMark size={12} />
                  SOLENQ
                </div>

                <h1
                  className="text-foreground leading-[1.08] tracking-tight"
                  style={{
                    fontSize: "clamp(2.1rem, 5vw, 3.25rem)",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  The hardest part isn't the words.{" "}
                  <span className="text-gradient-gold">It's knowing what to say.</span>
                </h1>

                <p
                  className="text-muted-foreground/75 max-w-sm mx-auto leading-relaxed"
                  style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "0.005em" }}
                >
                  Type what's happening. SOLENQ figures out the right thing to say — and why it works.
                </p>

                <div className="flex flex-col gap-2.5 max-w-xs mx-auto text-left pt-1">
                  {[
                    { icon: "💬", text: "Write the right message for any situation" },
                    { icon: "🧠", text: "Understand why it works — the psychology" },
                    { icon: "🔮", text: "See how they'll react before you send" },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.65 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Conversation Map ─────────────────────────────────── */}
            {mapOpen && !mapHistoryOpen && !result && !loading && (
              <div ref={mapRef}>
                <ConversationMap
                  initialSituation={situation}
                  onBack={() => setMapOpen(false)}
                  onUseOpening={(text) => {
                    setMapOpen(false);
                    setSituation(text + " ");
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }}
                />
              </div>
            )}

            {/* ── Map History ──────────────────────────────────────── */}
            {mapHistoryOpen && (
              <MapHistoryPanel
                onBack={() => setMapHistoryOpen(false)}
                onUseOpening={(text) => {
                  setMapHistoryOpen(false);
                  setSituation(text + " ");
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
              />
            )}

            {/* ── Input ───────────────────────────────────────────── */}
            {!mapOpen && !mapHistoryOpen && (<div ref={inputRef} className="space-y-5">
              {!result && !loading && (
                <h2
                  className="px-1"
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                    color: "hsl(var(--muted-foreground))",
                    opacity: 0.8,
                  }}
                >
                  What conversation are you trying to handle?
                </h2>
              )}

              {/* Pasted thread pill */}
              {pastedThread && !result && !loading && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: "hsl(220 60% 50% / 0.1)",
                      border: "1px solid hsl(220 60% 50% / 0.25)",
                      color: "hsl(220 60% 65%)",
                    }}
                  >
                    📋 Full thread pasted — reading full context
                  </span>
                  <button
                    onClick={() => { setPastedThread(false); setSituation(""); }}
                    className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Vault context pill */}
              {matchedContact && !result && !loading && !checkInStep && (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{
                      background: "hsl(38 60% 50% / 0.1)",
                      border: "1px solid hsl(38 60% 50% / 0.28)",
                      color: "hsl(38 60% 62%)",
                    }}
                  >
                    💡 Using context for {matchedContact.name}
                  </span>
                </div>
              )}

              {/* Command bar */}
              <div
                className={cn(
                  "input-glow flex items-center gap-2 px-3 transition-all duration-300",
                  inputFocused && "is-focused",
                  situation && inputFocused && "is-typing",
                  !result && !loading && "float-slow"
                )}
                style={{
                  minHeight: 64,
                  borderRadius: 22,
                  background: "hsl(var(--card))",
                }}
              >
                <SmartInputControls
                  onTranscript={(t) => setSituation(t)}
                  onAttach={(kind, file) => {
                    const note = kind === "screenshot" ? `[Screenshot: ${file.name}] ` : `[Audio: ${file.name}] `;
                    setSituation((s) => (s ? s + "\n" + note : note));
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  onPasteConversation={(text) => {
                    setSituation(s => s ? s + "\n\n" + text : text);
                    if (text.length > 200) setPastedThread(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  focused={inputFocused}
                  valueLength={situation.length}
                />
                <Textarea
                  ref={textareaRef}
                  placeholder={ROTATING_PLACEHOLDERS[placeholderIdx]}
                  rows={1}
                  aria-label="Describe the conversation you need help with"
                  className="flex-1 min-h-[44px] max-h-[200px] bg-transparent border-0 text-foreground placeholder:text-muted-foreground/35 text-[15px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 px-1 py-3.5 leading-snug"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setTimeout(() => setInputFocused(false), 350)}
                  onKeyDown={handleKeyDown}
                />
                {!result && (
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !situation.trim()}
                    aria-label="Handle this conversation"
                    title="Handle this (⌘↵)"
                    className="btn-solenq shrink-0 rounded-2xl h-11 px-5 text-[13px] font-semibold transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {loadingMsg}
                      </span>
                    ) : (
                      "Handle this"
                    )}
                  </button>
                )}
              </div>

              {/* Mood check-in */}
              {checkInStep && !loading && (
                <MoodCheckIn onComplete={handleCheckInComplete} onSkip={handleCheckInSkip} />
              )}

              {/* Live emotional feedback */}
              {emotionalFeedback && !result && !checkInStep && (
                <p
                  className={cn("emotional-feedback transition-opacity duration-500 text-center px-2", feedbackVisible && "visible")}
                  aria-live="polite"
                  style={{ fontStyle: "normal", fontWeight: 400 }}
                >
                  {emotionalFeedback}
                </p>
              )}

              {/* Keyboard hint */}
              {!result && !loading && (
                <p className="hidden sm:block text-center text-[11px]" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.3, marginTop: 8 }}>
                  ↵ to send · Shift+↵ for new line · Esc to start over
                </p>
              )}

              {/* Dynamic refine chips */}
              {dynamicChips.length > 0 && !result && !loading && !checkInStep && (
                <div className="flex flex-wrap gap-2 animate-fade-in">
                  <span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-wider self-center">Clarify:</span>
                  {dynamicChips.map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => handleAppendChip(chip.append)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: "hsl(var(--mode-accent) / 0.07)",
                        color: "hsl(var(--mode-accent))",
                        border: "1px solid hsl(var(--mode-accent) / 0.18)",
                      }}
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Warmth microcopy */}
              {!result && !loading && !situation && !checkInStep && (
                <div className="h-5 flex items-center justify-center overflow-hidden">
                  <p
                    key={warmthKey}
                    className="warmth-line text-center text-[12px]"
                    style={{ color: "hsl(var(--muted-foreground))", fontStyle: "italic", letterSpacing: "0.01em" }}
                  >
                    {WARMTH_LINES[warmthIdx]}
                  </p>
                </div>
              )}

              {/* Map it out entry point */}
              {!result && !loading && !mapOpen && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setMapOpen(true)}
                    className="group flex items-center gap-1.5 text-[13px] font-medium transition-all"
                    style={{ color: "hsl(var(--primary))" }}
                  >
                    Not sure what to say?
                    <span className="group-hover:translate-x-0.5 transition-transform inline-block">Map it out →</span>
                  </button>
                </div>
              )}

              {/* Example prompt */}
              {!result && !loading && !situation && !checkInStep && (
                <button
                  onClick={() => handleChip("Client promised payment last Friday but hasn't replied since. I don't want to sound desperate")}
                  className="block w-full text-left rounded-2xl p-5 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-250 animate-fade-in"
                  style={{
                    background: "hsl(var(--card) / 0.5)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                  }}
                >
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.75 }}>
                    "Client promised payment last Friday but hasn't replied since. I don't want to sound desperate."
                  </p>
                </button>
              )}

              {/* Static quick chips */}
              {!result && !loading && !situation && !checkInStep && (
                <div className="flex flex-wrap gap-2 justify-center animate-fade-in">
                  {STATIC_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChip(chip)}
                      className="text-[12px] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                      style={{
                        height: 34,
                        padding: "0 16px",
                        borderRadius: 999,
                        background: "hsl(var(--card) / 0.6)",
                        border: "1px solid rgba(255,255,255,0.055)",
                        color: "hsl(var(--muted-foreground))",
                        fontWeight: 450,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "hsl(var(--foreground))";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.055)";
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Auto-detected mode label */}
              {situation.length > 10 && !result && !loading && (
                <p
                  className="text-center animate-fade-in"
                  style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.45 }}
                >
                  Reading this as a {detectedMode} situation
                </p>
              )}

            </div>)}

            {/* Loading skeleton */}
            {loading && (
              <div
                className="rounded-3xl p-10 relative overflow-hidden animate-appear-up"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid rgba(255,255,255,0.04)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.2), 0 12px 36px -8px rgba(0,0,0,0.3)",
                  backgroundImage: "linear-gradient(90deg, transparent 25%, hsl(var(--primary) / 0.025) 50%, transparent 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer-soft 2.2s linear infinite",
                }}
              >
                <div className="h-2 w-16 bg-muted-foreground/10 rounded-full mb-7" />
                <div className="h-5 w-full bg-muted-foreground/8 rounded-xl mb-3.5" />
                <div className="h-5 w-4/5 bg-muted-foreground/7 rounded-xl mb-3.5" />
                <div className="h-5 w-3/5 bg-muted-foreground/5 rounded-xl" />
                <p className="mt-8 text-xs animate-pulse" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
                  {loadingMsg}
                </p>
              </div>
            )}

            {/* Results */}
            <div ref={resultsRef} className="space-y-4">
              {result && !loading && (
                <>
                  <div className="flex justify-center pb-2 animate-fade-in">
                    <IntentChips
                      value={intent}
                      disabled={loading}
                      onChange={(i) => {
                        setIntent(i);
                        if (situation.trim()) generate(situation, mode, result.level, i);
                      }}
                    />
                  </div>
                  <ResultCard
                    result={result}
                    onRefine={handleRefine}
                    refining={refining}
                    mode={mode}
                    situation={situation}
                    onEscalate={(dir) => {
                      const current = result.level || (mode === "paid" ? 3 : 2);
                      const next = dir === "up" ? Math.min(5, current + 1) : Math.max(1, current - 1);
                      generate(situation, mode, next);
                    }}
                    onCopy={() => { window.setTimeout(() => setPostActionOpen(true), 3000); }}
                    onReveal={() => { window.setTimeout(() => setPostActionOpen(true), 600); }}
                  />
                  {settings.followUpEnabled && (
                    <FollowUpCard
                      situation={situation}
                      mode={mode}
                      message={result.message}
                      level={result.level || (mode === "paid" ? 3 : 2)}
                    />
                  )}

                  {!showSimulator ? (
                    <button
                      onClick={() => setShowSimulator(true)}
                      className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.99]"
                      style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.06)" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,169,107,0.2)"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                    >
                      <span className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.75 }}>
                        How might they react?
                      </span>
                      <span className="text-xs" style={{ color: "hsl(var(--primary))", opacity: 0.7 }}>See predictions →</span>
                    </button>
                  ) : (
                    <ResponseSimulator
                      situation={situation}
                      message={result.message}
                      mode={mode}
                      tone={intentToTone(intent)}
                      onUseMove={(text) => {
                        setSituation(text);
                        setResult(null);
                        setShowSimulator(false);
                        setTimeout(() => textareaRef.current?.focus(), 100);
                      }}
                    />
                  )}
                </>
              )}
            </div>

            {/* Bottom actions */}
            {result && !loading && (
              <div className="flex items-center justify-center gap-3 animate-fade-in pt-2 pb-6">
                <Button
                  onClick={() => {
                    setPostActionOpen(true);
                    toast({ title: "Sent.", description: "Come back if they don't respond." });
                  }}
                  className="btn-solenq rounded-2xl px-6 h-11 text-[13px] font-semibold border-0 transition-all active:scale-[0.97]"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send it
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleEditRetry}
                  className="rounded-2xl px-5 h-11 text-xs active:scale-[0.97] transition-all duration-200"
                  style={{ color: "hsl(var(--muted-foreground))", opacity: 0.7 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                >
                  Try differently
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <DNAPanel open={dnaOpen} onClose={() => setDnaOpen(false)} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        update={updateSettings}
        onClearHistory={() => {
          setChats([]);
          setActiveChatId(null);
          setResult(null);
          setSituation("");
          try { localStorage.removeItem("solenq-reminders"); } catch {/* ignore */}
          toast({ title: "History cleared" });
        }}
      />

      <PostActionPanel
        open={postActionOpen && !!result}
        onClose={() => setPostActionOpen(false)}
        onReplied={(replied) => {
          if (replied) {
            toast({ title: "Good — they responded." });
          } else if (result) {
            const current = result.level || (mode === "paid" ? 3 : 2);
            const next = Math.min(5, current + 1);
            if (next !== current) generate(situation, mode, next);
            else toast({ title: "You've reached the highest level.", description: "Give it 24 hours, then reassess." });
          }
        }}
        onTryDifferentTone={() => { if (result) handleRefine(mode === "paid" ? "softer" : "stronger"); }}
        onSeeStrategy={() => { resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
        onRemindLater={() => {
          if (!result) return;
          saveReminder({
            id: crypto.randomUUID(), situation, mode, message: result.message,
            level: result.level || (mode === "paid" ? 3 : 2),
            remindAt: Date.now() + 24 * 60 * 60 * 1000, createdAt: Date.now(),
          });
          toast({ title: "Reminder set.", description: "We'll nudge you tomorrow." });
        }}
        onSentNow={() => { toast({ title: "Sent.", description: "Come back if they don't respond." }); }}
        onEditRetry={handleEditRetry}
        onNewSituation={handleNewChat}
        onRateOutcome={(rating) => {
          saveOutcome({
            id: crypto.randomUUID(),
            date: Date.now(),
            situation: situation.slice(0, 60),
            rating,
            mode,
            conversationId: activeChatId ?? undefined,
          });
          recordRated();
          toast({ title: rating === 1 ? "Great outcome logged." : rating === 2 ? "Outcome noted." : "Noted — we'll help you improve next time.", description: "Your streak stays alive." });
        }}
      />

      <VaultPanel
        open={vaultOpen}
        contact={editingContact}
        onClose={() => { setVaultOpen(false); setEditingContact(null); }}
        onSaved={() => setContacts(loadContacts())}
      />

      {/* Mobile bottom nav */}
      <nav
        className="mobile-bottom-nav"
        style={{ background: "#0D0F14" }}
      >
        <button
          className="flex flex-col items-center justify-center w-16 h-full transition-colors"
          style={{ color: !vaultOpen ? "#C8A96B" : "rgba(148,163,184,0.5)" }}
          onClick={() => { setVaultOpen(false); setSidebarOpen(false); }}
          aria-label="Home"
        >
          <Home className="h-5 w-5" />
        </button>
        <button
          className="flex flex-col items-center justify-center w-16 h-full transition-colors"
          style={{ color: vaultOpen ? "#C8A96B" : "rgba(148,163,184,0.5)" }}
          onClick={() => { setEditingContact(null); setVaultOpen(true); setSidebarOpen(false); }}
          aria-label="Vault"
        >
          <Users className="h-5 w-5" />
        </button>
        <button
          className="flex flex-col items-center justify-center w-16 h-full transition-colors"
          style={{ color: sidebarOpen ? "#C8A96B" : "rgba(148,163,184,0.5)" }}
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Stats"
        >
          <BarChart2 className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
};

export default Index;
