import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { groqJSON } from "@/lib/groq";

interface Reaction {
  label: string;
  emoji: string;
  probability: "Most likely" | "Possible" | "Less likely";
  theirResponse?: string;
  yourNextMove: string;
}

interface ResponseSimulatorProps {
  situation: string;
  message: string;
  mode: string;
  tone: string;
  onUseMove: (text: string) => void;
}

const PROBABILITY_STYLES: Record<string, { bg: string; color: string }> = {
  "Most likely": { bg: "hsl(142 60% 40% / 0.12)", color: "hsl(142 60% 55%)" },
  "Possible":    { bg: "hsl(38 60% 50% / 0.12)",  color: "hsl(38 60% 62%)" },
  "Less likely": { bg: "hsl(220 15% 50% / 0.12)", color: "hsl(220 15% 62%)" },
};

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-4 min-w-[220px] flex-1 space-y-3 overflow-hidden relative"
      style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_linear_infinite]"
        style={{ background: "linear-gradient(90deg, transparent 25%, hsl(var(--primary) / 0.04) 50%, transparent 75%)" }}
      />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-muted-foreground/10" />
        <div className="h-3 w-28 rounded-full bg-muted-foreground/10" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted-foreground/8" />
      <div className="h-2.5 w-4/5 rounded-full bg-muted-foreground/6" />
      <div className="mt-2 h-2.5 w-full rounded-full bg-muted-foreground/8" />
      <div className="h-2.5 w-3/5 rounded-full bg-muted-foreground/6" />
    </div>
  );
}

export default function ResponseSimulator({ situation, message, mode, tone, onUseMove }: ResponseSimulatorProps) {
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState<Reaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fetchedRef = useRef(false);

  const fetchSimulation = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);

    const simPrompt = `Given this situation: "${situation}" and this message being sent: "${message}"

Predict exactly 3 realistic reactions this specific person will have. Return ONLY a valid JSON object, no markdown:
{"reactions":[{"label":"They agree","emoji":"✅","probability":"Most likely","theirResponse":"One natural sentence they might actually say","yourNextMove":"One concrete next step"},{"label":"They push back","emoji":"⚡","probability":"Possible","theirResponse":"One sentence of realistic pushback","yourNextMove":"One calm specific response"},{"label":"They go silent","emoji":"🔇","probability":"Less likely","theirResponse":"No response or one dismissive word","yourNextMove":"What to do after a few days of silence"}]}`;

    try {
      let fetchedReactions: Reaction[] | null = null;

      // Try edge function first
      try {
        const { data, error: fnError } = await supabase.functions.invoke("generate-response", {
          body: { variant: "simulate", situation, message, mode, tone },
        });
        if (!fnError && data?.reactions?.length) {
          fetchedReactions = data.reactions;
        } else {
          throw new Error("Edge function unavailable");
        }
      } catch {
        // Fall back to direct Groq call
        const result = await groqJSON<{ reactions: Reaction[] }>(simPrompt);
        fetchedReactions = result.reactions;
      }

      if (!fetchedReactions?.length) throw new Error("No reactions returned");
      setReactions(fetchedReactions);
    } catch {
      setError("Couldn't load predictions.");
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimulation();
    return () => { fetchedRef.current = false; };
  }, []);

  const handleUseMove = (idx: number, text: string) => {
    setCopiedIdx(idx);
    onUseMove(text);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      <div className="w-full flex items-center px-1 py-2">
        <span
          className="text-[12px] font-semibold tracking-wide"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          How might they react?
        </span>
      </div>

      <div className="mt-3">
        {loading && (
          <div className="simulator-cards-row sm:grid sm:grid-cols-3 sm:overflow-visible">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.6 }}>{error}</p>
            <button
              onClick={() => { fetchedRef.current = false; fetchSimulation(); }}
              className="text-xs px-4 py-2 rounded-xl transition-all"
              style={{
                background: "hsl(var(--primary) / 0.1)",
                color: "hsl(var(--primary))",
                border: "1px solid hsl(var(--primary) / 0.2)",
              }}
            >
              Try again
            </button>
          </div>
        )}

        {reactions && !loading && (
          <div className="simulator-cards-row sm:grid sm:grid-cols-3 sm:overflow-visible">
            {reactions.map((r, i) => {
              const probStyle = PROBABILITY_STYLES[r.probability] ?? PROBABILITY_STYLES["Less likely"];
              return (
                <div
                  key={i}
                  className="simulator-card rounded-2xl p-4 flex-1 flex flex-col gap-3"
                  style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{r.emoji}</span>
                      <span className="font-semibold leading-tight" style={{ fontSize: 13, color: "hsl(var(--foreground))" }}>
                        {r.label}
                      </span>
                    </div>
                    <span
                      className="shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 whitespace-nowrap"
                      style={{ background: probStyle.bg, color: probStyle.color }}
                    >
                      {r.probability}
                    </span>
                  </div>

                  {r.theirResponse && (
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
                        They might say:
                      </p>
                      <p className="leading-relaxed" style={{ fontSize: 12, fontStyle: "italic", color: "hsl(var(--muted-foreground))", opacity: 0.75 }}>
                        "{r.theirResponse}"
                      </p>
                    </div>
                  )}

                  <div
                    className="rounded-xl px-3 py-2 mt-auto"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.04)",
                      borderLeftWidth: 2,
                      borderLeftColor: "rgba(200,169,107,0.4)",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "hsl(38 60% 62%)", opacity: 0.7 }}>
                      Your move:
                    </p>
                    <p className="leading-relaxed mb-2" style={{ fontSize: 12, color: "hsl(var(--foreground))", opacity: 0.8 }}>
                      {r.yourNextMove}
                    </p>
                    <button
                      onClick={() => handleUseMove(i, r.yourNextMove)}
                      className="text-[11px] font-semibold transition-all duration-200 hover:opacity-100"
                      style={{ color: "hsl(38 60% 62%)", opacity: copiedIdx === i ? 1 : 0.7 }}
                    >
                      {copiedIdx === i ? "✓ Added to input" : "Use this →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
