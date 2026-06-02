import { useState } from "react";
import { cn } from "@/lib/utils";

const MOODS: { key: string; emoji: string }[] = [
  { key: "Calm", emoji: "😌" },
  { key: "Anxious", emoji: "😰" },
  { key: "Frustrated", emoji: "😤" },
  { key: "Overwhelmed", emoji: "😔" },
];

const GOALS: { key: string }[] = [
  { key: "Keep the relationship" },
  { key: "Get a clear outcome" },
  { key: "Protect my reputation" },
  { key: "Move past this" },
];

interface MoodCheckInProps {
  onComplete: (mood: string, goal: string) => void;
  onSkip: () => void;
}

export default function MoodCheckIn({ onComplete, onSkip }: MoodCheckInProps) {
  const [step, setStep] = useState<"mood" | "goal" | "confirming">("mood");
  const [mood, setMood] = useState<string | null>(null);

  const handleMood = (m: string) => {
    setMood(m);
    setStep("goal");
  };

  const handleGoal = (g: string) => {
    setStep("confirming");
    setTimeout(() => onComplete(mood!, g), 900);
  };

  return (
    <div
      className="space-y-4 animate-fade-in"
      style={{ animationDuration: "200ms", animationTimingFunction: "ease" }}
    >
      {step === "mood" && (
        <div className="space-y-3">
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.8 }}>
            How are you feeling right now?
          </p>
          <div className="mood-grid">
            {MOODS.map((m) => (
              <Pill key={m.key} label={`${m.emoji} ${m.key}`} onClick={() => handleMood(m.key)} />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="text-[11px] transition-colors"
            style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.45"; }}
          >
            Skip for now
          </button>
        </div>
      )}

      {step === "goal" && (
        <div className="space-y-3 animate-fade-in">
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.8 }}>
            What matters most here?
          </p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Pill key={g.key} label={g.key} onClick={() => handleGoal(g.key)} />
            ))}
          </div>
          <button
            onClick={onSkip}
            className="text-[11px] transition-colors"
            style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.45"; }}
          >
            Skip for now
          </button>
        </div>
      )}

      {step === "confirming" && (
        <p
          className="animate-fade-in"
          style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.75, fontStyle: "italic" }}
        >
          Got it. Finding the right approach for your situation.
        </p>
      )}
    </div>
  );
}

function Pill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "transition-all duration-150 active:scale-[0.96]",
        "text-[13px] font-medium"
      )}
      style={{
        height: 36,
        padding: "0 16px",
        borderRadius: 999,
        background: "hsl(var(--card))",
        border: "1px solid rgba(255,255,255,0.07)",
        color: "hsl(var(--muted-foreground))",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.45)";
        e.currentTarget.style.color = "hsl(var(--foreground))";
        e.currentTarget.style.background = "hsl(var(--primary) / 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
        e.currentTarget.style.color = "hsl(var(--muted-foreground))";
        e.currentTarget.style.background = "hsl(var(--card))";
      }}
    >
      {label}
    </button>
  );
}
