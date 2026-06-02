import { useState } from "react";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReminderRecord {
  id: string;
  situation: string;
  mode: "relationship" | "paid";
  message: string;
  level: number;
  remindAt: number;
  createdAt: number;
}

const STORAGE_KEY = "solenq-reminders";

export function loadReminders(): ReminderRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReminderRecord[];
  } catch {
    return [];
  }
}

export function saveReminder(r: ReminderRecord) {
  const list = loadReminders().filter((x) => x.id !== r.id);
  list.push(r);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function clearReminder(id: string) {
  const list = loadReminders().filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDueReminders(): ReminderRecord[] {
  const now = Date.now();
  return loadReminders().filter((r) => r.remindAt <= now);
}

interface FollowUpCardProps {
  situation: string;
  mode: "relationship" | "paid";
  message: string;
  level: number;
}

const PRESETS: { label: string; ms: number }[] = [
  { label: "Tomorrow", ms: 24 * 60 * 60 * 1000 },
  { label: "In 2 days", ms: 2 * 24 * 60 * 60 * 1000 },
  { label: "Next week", ms: 7 * 24 * 60 * 60 * 1000 },
];

export default function FollowUpCard({ situation, mode, message, level }: FollowUpCardProps) {
  const [state, setState] = useState<"idle" | "picking" | "saved" | "sent">("idle");
  const [savedLabel, setSavedLabel] = useState("");

  const handleRemind = (label: string, ms: number) => {
    saveReminder({
      id: crypto.randomUUID(),
      situation,
      mode,
      message,
      level,
      remindAt: Date.now() + ms,
      createdAt: Date.now(),
    });
    setSavedLabel(label);
    setState("saved");
  };

  if (state === "saved") {
    return (
      <div className="rounded-2xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)] p-4 flex items-center gap-3 animate-fade-in">
        <Check className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
        <p className="text-xs text-foreground">
          Got it. We'll nudge you <span className="font-semibold">{savedLabel.toLowerCase()}</span> with the next escalation step.
        </p>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 animate-fade-in">
        <Check className="h-4 w-4 text-[hsl(var(--mode-accent))] shrink-0" />
        <p className="text-xs text-foreground">Nice. Come back if they don't reply — we'll level it up for you.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 animate-fade-in">
      {state === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setState("picking")}
            className="rounded-xl text-xs font-normal h-9 transition-all hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" /> Remind me later
          </Button>
          <Button
            size="sm"
            onClick={() => setState("sent")}
            className="rounded-xl text-xs font-normal h-9 transition-all hover:-translate-y-0.5 active:scale-[0.97]"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" /> I'll send now
          </Button>
        </div>
      )}

      {state === "picking" && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pick a time</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleRemind(p.label, p.ms)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg bg-secondary/60 text-foreground hover:bg-secondary transition-all duration-150",
                  "border border-border/60 hover:border-[hsl(var(--mode-accent)/0.4)] hover:-translate-y-0.5 active:scale-[0.97]"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setState("idle")}
              className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
