import { useState } from "react";
import { ArrowLeft, ChevronRight, Map } from "lucide-react";
import { loadMaps, type SavedMap, type MapResult } from "@/lib/maps";

interface MapHistoryPanelProps {
  onBack: () => void;
  onUseOpening: (text: string) => void;
}

export default function MapHistoryPanel({ onBack, onUseOpening }: MapHistoryPanelProps) {
  const [maps] = useState<SavedMap[]>(() => loadMaps());
  const [selected, setSelected] = useState<SavedMap | null>(null);

  if (selected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-[12px] transition-opacity"
          style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.5"; }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to history
        </button>

        <div className="space-y-1">
          <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.45 }}>
            {new Date(selected.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h2 className="font-semibold" style={{ fontSize: 17, color: "hsl(var(--foreground))", letterSpacing: "-0.01em" }}>
            {selected.answers.q1}
          </h2>
        </div>

        <MapResultView result={selected.map} onUseOpening={onUseOpening} />
      </div>
    );
  }

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

      <div className="flex items-center gap-2">
        <Map className="h-4 w-4" style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />
        <h2 className="font-semibold" style={{ fontSize: 18, color: "hsl(var(--foreground))", letterSpacing: "-0.015em" }}>
          Map history
        </h2>
      </div>

      {maps.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", opacity: 0.5, fontStyle: "italic" }}>
            No maps yet. Use "Map it out" to create your first conversation map.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {maps.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="w-full text-left rounded-2xl p-4 transition-all duration-150 active:scale-[0.98] group"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(200,169,107,0.3)";
                e.currentTarget.style.background = "rgba(200,169,107,0.03)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                e.currentTarget.style.background = "hsl(var(--card))";
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 500, color: "hsl(var(--foreground))", opacity: 0.85 }}>
                    {m.answers.q1}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: "rgba(200,169,107,0.08)", color: "#C8A96B", border: "1px solid rgba(200,169,107,0.18)" }}
                    >
                      {m.answers.q2}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", opacity: 0.38 }}>
                    {new Date(m.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "hsl(var(--muted-foreground))", opacity: 0.35 }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MapResultView({
  result,
  onUseOpening,
}: {
  result: MapResult;
  onUseOpening: (text: string) => void;
}) {
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
          <p
            className="px-1"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "hsl(var(--muted-foreground))", opacity: 0.45 }}
          >
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
