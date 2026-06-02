import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { groqJSON } from "@/lib/groq";
import { saveMap, type MapResult } from "@/lib/maps";

const QUESTIONS = [
  {
    q: "What's the conversation you're dreading?",
    pills: [
      "Asking for something",
      "Ending or changing something",
      "Confronting a problem",
      "Setting a boundary",
    ],
  },
  {
    q: "What are you most afraid will happen?",
    pills: [
      "They get upset or angry",
      "They say no",
      "It damages the relationship",
      "They dismiss me",
    ],
  },
  {
    q: "What would feel like a win, even a small one?",
    pills: [
      "They hear me out fully",
      "We stay on good terms",
      "I get what I asked for",
      "I just finally say it",
    ],
  },
];

interface ConversationMapProps {
  initialSituation?: string;
  onBack: () => void;
  onUseOpening: (text: string) => void;
}

export default function ConversationMap({
  initialSituation = "",
  onBack,
  onUseOpening,
}: ConversationMapProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapResult, setMapResult] = useState<MapResult | null>(null);
  const [mapError, setMapError] = useState(false);

  const handlePill = (pill: string) => {
    setSelected(pill);
    const newAnswers = [...answers, pill];
    setAnswers(newAnswers);
    if (step < 2) {
      setStep(step + 1);
      setSelected(null);
    } else {
      runMap(newAnswers);
    }
  };

  const runMap = async (ans: string[]) => {
    setStep(3);
    setLoading(true);
    setMapError(false);

    const mapPrompt = `You are a calm communication coach helping someone have a difficult conversation. Answer based on:
Conversation type: ${ans[0]}
Biggest fear: ${ans[1]}
Definition of a win: ${ans[2]}
Extra context: ${initialSituation || "none"}

Return ONLY a valid JSON object, no markdown, no explanation:
{"opening":"One natural human sentence on how to open this conversation","coreMessage":"The exact thing to say — one direct sentence that gets to the point","branches":[{"tag":"If they respond well","action":"What to say or do next"},{"tag":"If they push back","action":"How to handle it calmly without escalating"},{"tag":"If they shut down","action":"How to exit gracefully without burning the relationship"}],"doNotSay":"One specific thing to avoid saying and a brief reason why","reminder":"One warm grounding sentence to calm them before they start"}`;

    const attemptMap = async (attemptsLeft: number): Promise<void> => {
      try {
        let result: MapResult | null = null;

        // Try edge function first
        try {
          const { data, error } = await supabase.functions.invoke("generate-response", {
            body: { mode: "map", q1: ans[0], q2: ans[1], q3: ans[2], context: initialSituation || "" },
          });
          if (!error && data?.opening) {
            result = data as MapResult;
          } else {
            throw new Error("Edge function unavailable");
          }
        } catch {
          // Fall back to direct Groq call
          result = await groqJSON<MapResult>(mapPrompt);
        }

        if (!result?.opening) throw new Error("Invalid map result");
        setMapResult(result);
        saveMap({
          id: crypto.randomUUID(),
          date: Date.now(),
          answers: { q1: ans[0], q2: ans[1], q3: ans[2] },
          map: result,
        });
      } catch {
        if (attemptsLeft > 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return attemptMap(attemptsLeft - 1);
        }
        setMapError(true);
        setStep(2);
      }
    };

    await attemptMap(2);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[12px] transition-opacity"
        style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {step <= 2 && (
        <>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-0.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: i <= step ? "#C8A96B" : "rgba(255,255,255,0.08)" }}
              />
            ))}
            <span style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", opacity: 0.4, whiteSpace: "nowrap" }}>
              Step {step + 1} of 3
            </span>
          </div>

          {mapError && (
            <p
              className="text-center text-sm"
              style={{ color: "hsl(var(--muted-foreground))", opacity: 0.6 }}
            >
              Something went wrong. Try again.
            </p>
          )}

          <div className="space-y-5 animate-fade-in" key={step}>
            <h2
              className="font-semibold leading-snug"
              style={{ fontSize: 20, color: "hsl(var(--foreground))", letterSpacing: "-0.015em" }}
            >
              {QUESTIONS[step].q}
            </h2>

            <div className="flex flex-col gap-2.5">
              {QUESTIONS[step].pills.map((pill) => {
                const isSelected = selected === pill;
                return (
                  <button
                    key={pill}
                    onClick={() => handlePill(pill)}
                    className="w-full text-left px-5 py-3.5 rounded-2xl text-[13px] font-medium transition-all duration-150 active:scale-[0.98]"
                    style={{
                      background: isSelected ? "rgba(200,169,107,0.08)" : "hsl(var(--card))",
                      border: isSelected ? "1px solid rgba(200,169,107,0.5)" : "1px solid rgba(255,255,255,0.07)",
                      color: isSelected ? "#C8A96B" : "hsl(var(--muted-foreground))",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(200,169,107,0.4)";
                        e.currentTarget.style.color = "#C8A96B";
                        e.currentTarget.style.background = "rgba(200,169,107,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                        e.currentTarget.style.background = "hsl(var(--card))";
                      }
                    }}
                  >
                    {pill}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          {loading && <MapSkeleton />}
          {mapResult && !loading && (
            <MapResultView result={mapResult} onUseOpening={onUseOpening} />
          )}
        </>
      )}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="h-2.5 w-48 bg-muted-foreground/10 rounded-full mx-auto" />
      <div className="h-16 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)" }} />
      <div className="h-20 rounded-2xl" style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)" }} />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 rounded-2xl"
          style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)", opacity: 1 - i * 0.15 }}
        />
      ))}
      <p className="text-center text-[11px] animate-pulse pt-1" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.4 }}>
        Mapping your conversation…
      </p>
    </div>
  );
}

function MapResultView({ result, onUseOpening }: { result: MapResult; onUseOpening: (text: string) => void }) {
  return (
    <div className="space-y-3.5 animate-fade-in">
      <p
        className="text-center px-2"
        style={{ fontSize: 13, color: "#C8A96B", opacity: 0.85, fontStyle: "italic", lineHeight: 1.7 }}
      >
        {result.reminder}
      </p>

      <div
        className="rounded-2xl p-5 space-y-2"
        style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>
          HOW TO OPEN
        </p>
        <p style={{ fontSize: 14, color: "hsl(var(--foreground))", lineHeight: 1.7, opacity: 0.85 }}>
          {result.opening}
        </p>
      </div>

      <div
        className="rounded-2xl p-5 space-y-2"
        style={{ background: "hsl(var(--card))", border: "1px solid rgba(200,169,107,0.15)" }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#C8A96B", opacity: 0.8 }}>
          WHAT TO SAY
        </p>
        <p style={{ fontSize: 16, color: "hsl(var(--foreground))", lineHeight: 1.7, fontWeight: 500 }}>
          {result.coreMessage}
        </p>
      </div>

      {result.branches?.length > 0 && (
        <div className="space-y-2.5">
          <p className="px-1" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
            WHEN THEY RESPOND:
          </p>
          {result.branches.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 space-y-2"
              style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(200,169,107,0.09)", color: "#C8A96B", border: "1px solid rgba(200,169,107,0.2)" }}
              >
                {b.tag}
              </span>
              <p style={{ fontSize: 13, color: "hsl(var(--foreground))", opacity: 0.72, lineHeight: 1.6 }}>
                {b.action}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{
          background: "rgba(245,158,11,0.03)",
          border: "1px solid rgba(245,158,11,0.08)",
          borderLeft: "3px solid rgba(245,158,11,0.45)",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(245,158,11,0.75)", marginBottom: 6 }}>
          DON'T SAY
        </p>
        <p style={{ fontSize: 13, color: "hsl(var(--foreground))", opacity: 0.68, lineHeight: 1.6 }}>
          {result.doNotSay}
        </p>
      </div>

      <button
        onClick={() => onUseOpening(result.opening)}
        className="btn-solenq w-full rounded-2xl font-semibold text-[14px] transition-all active:scale-[0.97]"
        style={{ height: 52 }}
      >
        Write my opening message →
      </button>
    </div>
  );
}
