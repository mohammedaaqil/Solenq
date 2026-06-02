import { useState } from "react";
import { X, Sparkles, AlertTriangle, TrendingUp, PenTool, Loader2, Gauge, ShieldAlert, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function parseList(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const items = lines.map(l => l.replace(/^\d+\.\s+/, "")).filter(Boolean);
  return items.length > 1 ? items : [text];
}

interface StyleAnalysis {
  style_breakdown: string;
  style_strengths: string;
  style_weaknesses: string;
  style_improvements: string;
  upgraded_slightly?: string;
  upgraded_stronger?: string;
  upgraded_style?: string;
  behavior_insight?: string;
  score?: number;
  tone_type?: string;
  risk_level?: "Low" | "Medium" | "High";
}

interface DNAPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function DNAPanel({ open, onClose }: DNAPanelProps) {
  const [sample, setSample] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [showShare, setShowShare] = useState(false);

  const analyze = async () => {
    if (!sample.trim()) return;
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("That took too long. Please try again.");
    }, 30000);
    try {
      const { data, error } = await supabase.functions.invoke("generate-response", {
        body: { kind: "dna", writingSample: sample },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAnalysis(data as StyleAnalysis);
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  if (!open) return null;

  const riskColor = analysis?.risk_level === "High"
    ? "text-[hsl(var(--destructive))]"
    : analysis?.risk_level === "Medium"
    ? "text-warning"
    : "text-[hsl(var(--success))]";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-[hsl(var(--surface))] border-l border-border overflow-y-auto animate-slide-in-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(var(--surface))] z-10">
          <div className="flex items-center gap-2">
            <PenTool className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Your Communication DNA</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paste real messages you've sent to clients. We'll analyze your style and show you exactly what to fix.
          </p>

          <Textarea
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            placeholder="Paste your past messages here..."
            className="min-h-[120px] bg-card border-border rounded-xl text-sm resize-none"
          />

          <Button onClick={analyze} disabled={loading || !sample.trim()} className="w-full rounded-xl active:scale-[0.97] transition-transform">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing your style...</> : "Analyze My Style"}
          </Button>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex items-center justify-between gap-2">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-destructive/70 hover:text-destructive font-semibold">Dismiss</button>
            </div>
          )}

          {analysis && (
            <div className="space-y-3 animate-fade-in-up">
              {/* Score banner */}
              {(analysis.score !== undefined || analysis.tone_type || analysis.risk_level) && (
                <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <Gauge className="h-3 w-3" /> Score
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {analysis.score ?? "—"}<span className="text-xs text-muted-foreground">/10</span>
                    </div>
                  </div>
                  <div className="text-center border-x border-border/60 px-2">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Tone</div>
                    <div className="text-xs font-semibold text-foreground leading-tight">{analysis.tone_type || "—"}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      <ShieldAlert className="h-3 w-3" /> Risk
                    </div>
                    <div className={cn("text-sm font-bold", riskColor)}>{analysis.risk_level || "—"}</div>
                  </div>
                </div>
              )}

              <DNACard icon={<PenTool className="h-3.5 w-3.5 text-primary" />} title="🧠 Your DNA" content={analysis.style_breakdown} />
              <DNACard icon={<Sparkles className="h-3.5 w-3.5 text-[hsl(var(--success))]" />} title="🔍 What's Working" content={analysis.style_strengths} color="success" />
              <DNACard icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />} title="⚠️ Holding You Back" content={analysis.style_weaknesses} color="warning" />
              <DNACard icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} title="🔥 How to Improve" content={analysis.style_improvements} />

              {analysis.behavior_insight && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Eye className="h-3.5 w-3.5 text-warning" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-warning">👀 What Your Client Thinks</span>
                  </div>
                  <p className="text-xs text-foreground/85 leading-relaxed italic">"{analysis.behavior_insight}"</p>
                </div>
              )}

              {(analysis.upgraded_slightly || analysis.upgraded_stronger || analysis.upgraded_style) && (
                <div className="space-y-2">
                  {analysis.upgraded_slightly && (
                    <div className="rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.05)] p-4">
                      <p className="text-[10px] font-bold text-[hsl(var(--success))] uppercase tracking-widest mb-2">✍️ Slightly Better</p>
                      <p className="text-sm text-foreground italic leading-relaxed">"{analysis.upgraded_slightly}"</p>
                    </div>
                  )}
                  {(analysis.upgraded_stronger || analysis.upgraded_style) && (
                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">⚡ Stronger</p>
                      <p className="text-sm text-foreground italic leading-relaxed">"{analysis.upgraded_stronger || analysis.upgraded_style}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Share button */}
              <button
                onClick={() => setShowShare(true)}
                className="w-full rounded-xl py-3 text-[13px] font-semibold transition-all active:scale-[0.97]"
                style={{ background: "rgba(200,169,107,0.1)", border: "1px solid rgba(200,169,107,0.25)", color: "#C8A96B" }}
              >
                Share my results →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && analysis && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70"
          onClick={() => setShowShare(false)}
        >
          <div
            className="w-[320px] rounded-2xl p-6 space-y-4"
            style={{ background: "hsl(var(--surface))", border: "1px solid rgba(200,169,107,0.25)" }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#C8A96B", textAlign: "center" }}>
              SOLENQ · COMMUNICATION DNA
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span style={{ fontSize: 36, fontWeight: 800, color: "#C8A96B" }}>{analysis.score ?? "—"}</span>
                <span style={{ fontSize: 14, color: "hsl(var(--muted-foreground))" }}>/10</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "hsl(var(--foreground))", maxWidth: 160, textAlign: "right", lineHeight: 1.4 }}>
                {analysis.tone_type}
              </p>
            </div>
            <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", lineHeight: 1.6, fontStyle: "italic" }}>
              {(analysis.style_breakdown ?? "").slice(0, 120)}{(analysis.style_breakdown?.length ?? 0) > 120 ? "..." : ""}
            </p>
            <button
              onClick={async () => {
                const text = `My Communication DNA (via SOLENQ):\n\nScore: ${analysis.score}/10\nStyle: ${analysis.tone_type}\n\n"${(analysis.style_breakdown ?? "").slice(0, 100)}"\n\nAnalyze yours free at solenq.app`;
                await navigator.clipboard.writeText(text);
              }}
              className="w-full rounded-xl py-3 text-[13px] font-semibold"
              style={{ background: "#C8A96B", color: "#0B0D10" }}
            >
              Copy to share
            </button>
            <button
              onClick={() => setShowShare(false)}
              className="w-full text-center text-[12px]"
              style={{ color: "#94A3B8", opacity: 0.6 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DNACard({ icon, title, content, color = "primary" }: { icon: React.ReactNode; title: string; content: string; color?: string }) {
  if (!content) return null;
  const items = parseList(content);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className={cn("text-[10px] font-bold uppercase tracking-widest",
          color === "warning" ? "text-warning" : color === "success" ? "text-[hsl(var(--success))]" : "text-primary"
        )}>{title}</span>
      </div>
      {items.length === 1 ? (
        <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{items[0]}</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground/80 leading-relaxed">
              <span style={{ color: "hsl(var(--primary))", fontWeight: 600, minWidth: 16, flexShrink: 0 }}>{i + 1}.</span>
              {item}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
