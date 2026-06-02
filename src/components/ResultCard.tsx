import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FollowUpStep {
  day: number;
  action: string;
}

export interface AIResult {
  analysis: string;
  advice: string;
  message: string;
  why_it_works?: string;
  level?: number;
  confidence?: "High" | "Medium";
  confidence_score?: number;
  client_type?: "Avoider" | "Busy but honest" | "Scope creeper" | "Low priority payer" | "Ghoster";
  client_insight?: string;
  expected_outcome?: string;
  follow_up_plan?: FollowUpStep[];
  whatsapp_message?: string;
  email_subject_lines?: string[];
  email_body?: string;
}

interface ResultCardProps {
  result: AIResult;
  onRefine: (variant: "softer" | "stronger") => void;
  refining: "softer" | "stronger" | null;
  mode: "relationship" | "paid";
  situation?: string;
  onEscalate?: (direction: "up" | "down") => void;
  onCopy?: () => void;
  onReveal?: () => void;
}

type CopyState = "idle" | "copied" | "error";

function dayToNaturalPhrase(day: number): string {
  if (day <= 3) return "If they stay silent for a few more days";
  if (day <= 10) return "If there's still no response after a week";
  return "At this point";
}

export default function ResultCard({ result, mode, situation, onCopy }: ResultCardProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [justCopied, setJustCopied] = useState(false);
  const [displayedMessage, setDisplayedMessage] = useState(result.message);
  const [showWhy, setShowWhy] = useState(false);
  const [showFeel, setShowFeel] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showChannels, setShowChannels] = useState(false);

  const reflection = useMemo(() => buildReflection(situation, mode, result), [situation, mode, result]);

  useEffect(() => {
    setCopyState("idle");
    setDisplayedMessage(result.message);
  }, [result.message]);

  const hasSection2 = !!(result.why_it_works || result.analysis);
  const hasSection3 = !!result.expected_outcome;
  const hasSection4 = !!(result.advice || (result.follow_up_plan?.length));

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy"); document.body.removeChild(ta); return ok;
    } catch { return false; }
  };

  const copyMessage = async () => {
    const ok = await copyToClipboard(displayedMessage);
    if (ok) {
      setCopyState("copied"); onCopy?.();
      setTimeout(() => setCopyState("idle"), 1200);
    } else {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2600);
    }
  };

  return (
    <div className="space-y-3 animate-appear-up">

      {/* Empathy line */}
      {reflection && (
        <p
          className="leading-relaxed px-1 animate-fade-in"
          style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", opacity: 0.75, fontStyle: "italic" }}
        >
          {reflection}
        </p>
      )}

      {/* ── Section 1: Message ─────────────────────────────── */}
      <div
        className="solenq-card relative overflow-hidden"
        style={{ padding: "36px 36px 28px" }}
      >
        {/* Ambient glow top-left */}
        <div
          aria-hidden
          className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.055) 0%, transparent 65%)" }}
        />

        <p
          className="text-foreground whitespace-pre-wrap select-all cursor-text leading-[1.8] relative"
          style={{ fontSize: "18px", fontWeight: 450, letterSpacing: "0.005em" }}
          onClick={(e) => {
            const range = document.createRange();
            range.selectNodeContents(e.currentTarget);
            const sel = window.getSelection();
            sel?.removeAllRanges(); sel?.addRange(range);
          }}
        >
          {displayedMessage}
        </p>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(displayedMessage);
              onCopy?.();
              setJustCopied(true);
              setTimeout(() => setJustCopied(false), 1400);
            }}
            disabled={!result.message}
            className={cn(
              "btn-delight rounded-2xl h-11 px-6 text-[13px] font-semibold border-0 transition-all duration-300",
              justCopied ? "text-[#0B0D10]" : "btn-solenq"
            )}
            style={justCopied ? { background: "#C8A96B", color: "#0B0D10" } : { background: justCopied ? "rgba(200,169,107,0.15)" : undefined }}
          >
            {justCopied
              ? "copied"
              : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>
            }
          </Button>
        </div>

        {copyState === "error" && (
          <p className="mt-2.5 text-[11px] text-muted-foreground/50">
            Couldn't copy automatically — select the text above.
          </p>
        )}
      </div>

      {/* ── Sections 2 & 3: Accordion ──────────────────── */}
      {(hasSection2 || hasSection3) && (
        <div className="space-y-2 animate-fade-in">
          {hasSection2 && (
            <div className="solenq-card-sm overflow-hidden">
              <button
                onClick={() => setShowWhy(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200"
                style={{ background: showWhy ? "rgba(255,255,255,0.025)" : "hsl(var(--card))" }}
                onMouseEnter={e => { if (!showWhy) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { if (!showWhy) e.currentTarget.style.background = showWhy ? "rgba(255,255,255,0.025)" : "hsl(var(--card))"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", opacity: 0.75 }}>
                  Why this works
                </span>
                <span style={{ color: "hsl(var(--primary))", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>›</span>
              </button>
              {showWhy && (
                <div className="px-5 pb-5 pt-1">
                  <p style={{ fontSize: 14, color: "hsl(var(--foreground))", opacity: 0.78, lineHeight: 1.65 }}>
                    {result.why_it_works || result.analysis}
                  </p>
                </div>
              )}
            </div>
          )}
          {hasSection3 && (
            <div className="solenq-card-sm overflow-hidden">
              <button
                onClick={() => setShowFeel(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200"
                style={{ background: showFeel ? "rgba(255,255,255,0.025)" : "hsl(var(--card))" }}
                onMouseEnter={e => { if (!showFeel) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={e => { if (!showFeel) e.currentTarget.style.background = showFeel ? "rgba(255,255,255,0.025)" : "hsl(var(--card))"; }}
              >
                <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", opacity: 0.75 }}>
                  What they'll probably feel
                </span>
                <span style={{ color: "hsl(var(--primary))", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>›</span>
              </button>
              {showFeel && (
                <div className="px-5 pb-5 pt-1">
                  <p style={{ fontSize: 14, color: "hsl(var(--foreground))", opacity: 0.78, lineHeight: 1.65 }}>
                    {result.expected_outcome}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Section 4: What to do next — Accordion ──────── */}
      {hasSection4 && (
        <div className="solenq-card-sm overflow-hidden animate-fade-in">
          <button
            onClick={() => setShowNext(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200"
            style={{ background: showNext ? "rgba(255,255,255,0.025)" : "hsl(var(--card))" }}
            onMouseEnter={e => { if (!showNext) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={e => { if (!showNext) e.currentTarget.style.background = showNext ? "rgba(255,255,255,0.025)" : "hsl(var(--card))"; }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", opacity: 0.75 }}>
              What to do next
            </span>
            <span style={{ color: "hsl(var(--primary))", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
          {showNext && (
            <div className="px-5 pb-5 pt-1 space-y-4">
              {result.advice && (
                <p style={{ fontSize: 14, color: "hsl(var(--foreground))", opacity: 0.78, lineHeight: 1.65 }}>
                  {result.advice}
                </p>
              )}
              {result.follow_up_plan && result.follow_up_plan.length > 0 && (
                <div className="space-y-2.5 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "hsl(var(--muted-foreground))", opacity: 0.5, letterSpacing: "0.08em" }}>
                    If they don't respond
                  </span>
                  {result.follow_up_plan.map((step, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span style={{ color: "hsl(var(--primary))", opacity: 0.5, fontSize: 14, lineHeight: 1.5 }}>›</span>
                      <span style={{ fontSize: 13, color: "hsl(var(--foreground))", opacity: 0.65, lineHeight: 1.5 }}>
                        <span style={{ color: "hsl(var(--primary))", opacity: 0.85, fontStyle: "italic" }}>{dayToNaturalPhrase(step.day)} — </span>
                        {step.action}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Channel Variants — Accordion ─────────────────── */}
      {(result.whatsapp_message || result.email_body) && (
        <div className="solenq-card-sm overflow-hidden animate-fade-in">
          <button
            onClick={() => setShowChannels(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 transition-all duration-200"
            style={{ background: showChannels ? "rgba(255,255,255,0.025)" : "hsl(var(--card))" }}
            onMouseEnter={e => { if (!showChannels) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={e => { if (!showChannels) e.currentTarget.style.background = showChannels ? "rgba(255,255,255,0.025)" : "hsl(var(--card))"; }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", opacity: 0.75 }}>
              Also works as WhatsApp or Email
            </span>
            <span style={{ color: "hsl(var(--primary))", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
          {showChannels && (
            <div className="px-5 pb-5 pt-2 space-y-3">
              {result.whatsapp_message && <ChannelVariant icon="💬" label="WhatsApp" content={result.whatsapp_message} />}
              {result.email_body && (
                <ChannelVariant icon="✉️" label="Email" content={result.email_body} subject={result.email_subject_lines?.[0]} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChannelVariant({ icon, label, content, subject }: { icon: string; label: string; content: string; subject?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="solenq-card-sm p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15 }}>{icon}</span>
          <span className="solenq-label">{label}</span>
        </div>
        <button
          onClick={async () => {
            const text = subject ? `Subject: ${subject}\n\n${content}` : content;
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          style={{ fontSize: 11, fontWeight: 600, color: copied ? "#4ade80" : "#C8A96B", transition: "color 200ms" }}
        >
          {copied ? "✓ Copied" : "Copy →"}
        </button>
      </div>
      {subject && (
        <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.55, fontStyle: "italic" }}>
          Subject: {subject}
        </p>
      )}
      <p style={{ fontSize: 13, color: "hsl(var(--foreground))", opacity: 0.72, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {content}
      </p>
    </div>
  );
}

function buildReflection(situation: string | undefined, mode: "relationship" | "paid", result: AIResult): string | null {
  if (!situation && !result?.analysis) return null;
  const s = (situation || "").toLowerCase();

  if (/(pay|paid|invoice|owed|owe)/.test(s)) {
    return mode === "paid"
      ? "That situation can feel stuck. This moves it forward without aggression."
      : "This keeps the relationship intact while making the ask clear.";
  }
  if (/(reply|replied|silent|ghost|ignored|no response|haven'?t heard)/.test(s)) {
    return mode === "paid"
      ? "Silence doesn't mean no. This breaks it cleanly."
      : "This nudges gently, without making the silence feel like an accusation.";
  }
  if (/(scope|extra|more work|additional)/.test(s)) {
    return mode === "paid"
      ? "Boundaries don't have to feel aggressive. This draws the line professionally."
      : "You can address this without it becoming a conflict.";
  }
  if (/(angry|upset|frustrat|conflict|disagree|unhappy)/.test(s)) {
    return "This lowers the temperature while keeping you in control.";
  }
  if (/(awkward|uncomfortable|weird)/.test(s)) {
    return "Awkward moments pass. The right words make that faster.";
  }
  return mode === "paid"
    ? "You don't need to sound demanding to be clear."
    : "You can stay warm and still move things forward.";
}
