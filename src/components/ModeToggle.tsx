import { Handshake, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type Mode = "relationship" | "paid";

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    setPulseKey((k) => k + 1);
  }, [mode]);

  const handleChange = (next: Mode) => {
    if (next !== mode) onChange(next);
  };

  const isNurture = mode === "relationship";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-col items-end gap-1">
        <div className="relative flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border/40">
          <span
            key={pulseKey}
            aria-hidden
            className={cn(
              "absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-out animate-mode-pulse",
              isNurture
                ? "left-1 right-[calc(50%+2px)]"
                : "left-[calc(50%+2px)] right-1"
            )}
            style={{
              background: isNurture
                ? "hsl(var(--accent) / 0.12)"
                : "hsl(var(--primary) / 0.12)",
              boxShadow: isNurture
                ? "0 0 16px -4px hsl(var(--accent) / 0.4), inset 0 0 0 1px hsl(var(--accent) / 0.2)"
                : "0 0 16px -4px hsl(var(--primary) / 0.4), inset 0 0 0 1px hsl(var(--primary) / 0.2)",
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleChange("relationship")}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200",
                )}
                style={{ color: isNurture ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}
              >
                <Handshake className="h-3.5 w-3.5" /> Nurture
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Preserve the relationship</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleChange("paid")}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200",
                )}
                style={{ color: !isNurture ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
              >
                <Zap className="h-3.5 w-3.5" /> Assert
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Drive a clear outcome</TooltipContent>
          </Tooltip>
        </div>
        <p className="text-[10px] text-muted-foreground/60 font-medium pr-1 transition-colors">
          {isNurture ? "Build trust" : "Drive results"}
        </p>
      </div>
    </TooltipProvider>
  );
}
