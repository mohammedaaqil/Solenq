import { cn } from "@/lib/utils";

export type Intent = "Gentle" | "Balanced" | "Direct";
export const INTENTS: Intent[] = ["Gentle", "Balanced", "Direct"];

export function intentToTone(i: Intent): "Gentle" | "Balanced" | "Assertive" {
  if (i === "Direct") return "Assertive";
  return i;
}

interface IntentChipsProps {
  value: Intent;
  onChange: (i: Intent) => void;
  disabled?: boolean;
}

const INTENT_LABELS: Record<Intent, string> = {
  Gentle:   "Warm",
  Balanced: "Balanced",
  Direct:   "Firm",
};

export default function IntentChips({ value, onChange, disabled }: IntentChipsProps) {
  return (
    <div className="flex items-center gap-1.5" role="tablist" aria-label="Conversation tone">
      {INTENTS.map((i) => {
        const active = i === value;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(i)}
            style={{
              height: 28,
              padding: "0 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.18s ease",
              border: active
                ? "1px solid hsl(var(--primary) / 0.4)"
                : "1px solid rgba(255,255,255,0.06)",
              background: active
                ? "hsl(var(--primary) / 0.1)"
                : "rgba(255,255,255,0.04)",
              color: active
                ? "hsl(var(--primary))"
                : "hsl(var(--muted-foreground))",
              boxShadow: active
                ? "0 0 16px -4px hsl(var(--primary) / 0.3)"
                : "none",
            }}
            className={cn(
              "chip-glass",
              disabled && "opacity-40 cursor-not-allowed",
            )}
          >
            {INTENT_LABELS[i]}
          </button>
        );
      })}
    </div>
  );
}
