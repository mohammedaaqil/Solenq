import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 1 | "rate" | 2 | 3;

const RATINGS = [
  { value: 1 as const, emoji: "😌", label: "Smooth — exactly what I wanted" },
  { value: 2 as const, emoji: "🤝", label: "Worked — could have been better" },
  { value: 3 as const, emoji: "😐", label: "Not quite — they pushed back" },
];

interface PostActionPanelProps {
  open: boolean;
  onClose: () => void;
  onReplied: (replied: boolean) => void;
  onTryDifferentTone: () => void;
  onSeeStrategy: () => void;
  onRemindLater: () => void;
  onSentNow: () => void;
  onEditRetry: () => void;
  onNewSituation: () => void;
  onRateOutcome?: (rating: 1 | 2 | 3) => void;
}

export default function PostActionPanel({
  open, onClose, onReplied, onTryDifferentTone, onSeeStrategy,
  onRemindLater, onSentNow, onEditRetry, onNewSituation, onRateOutcome,
}: PostActionPanelProps) {
  const [step, setStep] = useState<Step>(1);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const advance = (next: Step) => {
    setTransitioning(true);
    setTimeout(() => { setStep(next); setTransitioning(false); }, 160);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none px-4">
      <div
        className={cn(
          "glass-floating rounded-2xl pointer-events-auto",
          "w-full max-w-[340px] p-4 animate-fade-in-up relative"
        )}
        role="dialog"
        aria-label="What happened?"
      >
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 text-muted-foreground/60 hover:text-foreground p-1 rounded-md transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className={cn("transition-opacity duration-150", transitioning ? "opacity-0" : "opacity-100")}>
          {step === 1 && (
            <>
              <p className="text-[13px] font-semibold text-foreground mb-1">Did they respond?</p>
              <p className="text-[11px] text-muted-foreground/50 mb-3">Check back after you've sent it.</p>
              <div className="flex gap-2">
                <PanelBtn onClick={() => { onReplied(true); advance("rate"); }}>They replied</PanelBtn>
                <PanelBtn onClick={() => { onReplied(false); advance(2); }}>No reply yet</PanelBtn>
              </div>
            </>
          )}

          {step === "rate" && (
            <>
              <p className="text-[13px] font-semibold text-foreground mb-3">How did it go?</p>
              <div className="flex flex-col gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      onRateOutcome?.(r.value);
                      advance(2);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left",
                      "transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                    )}
                    style={{
                      background: "hsl(var(--card) / 0.8)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "hsl(var(--foreground))",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.25)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                  >
                    <span style={{ fontSize: 20 }}>{r.emoji}</span>
                    <span className="text-[12px] font-medium leading-snug">{r.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[13px] font-semibold text-foreground mb-3">How does this feel?</p>
              <div className="flex flex-wrap gap-2">
                <PanelBtn onClick={() => advance(3)}>This landed</PanelBtn>
                <PanelBtn onClick={() => { onTryDifferentTone(); onClose(); }}>Adjust tone</PanelBtn>
                <PanelBtn onClick={() => { onSeeStrategy(); onClose(); }}>See full read</PanelBtn>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-[13px] font-semibold text-foreground mb-3">What now?</p>
              <div className="grid grid-cols-2 gap-2">
                <PanelBtn onClick={() => { onRemindLater(); onClose(); }}>Remind me later</PanelBtn>
                <PanelBtn onClick={() => { onSentNow(); onClose(); }}>Send now</PanelBtn>
                <PanelBtn onClick={() => { onEditRetry(); onClose(); }}>Refine</PanelBtn>
                <PanelBtn onClick={() => { onNewSituation(); onClose(); }}>New conversation</PanelBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PanelBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 text-[12px] font-medium px-3 py-2 rounded-xl",
        "bg-secondary/60 hover:bg-secondary text-foreground",
        "border border-border/50 hover:border-border/80",
        "transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0"
      )}
    >
      {children}
    </button>
  );
}
