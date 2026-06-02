import { X, Settings as SettingsIcon, Sliders, User, ShieldCheck, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Settings } from "@/hooks/useSettings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClearHistory: () => void;
}

const STYLES: Settings["communicationStyle"][] = ["Friendly", "Professional", "Assertive"];
const RISKS: Settings["riskTolerance"][] = ["Low", "Medium", "High"];

export default function SettingsPanel({ open, onClose, settings, update, onClearHistory }: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md h-full bg-[hsl(var(--surface))] border-l border-border overflow-y-auto animate-slide-in-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-[hsl(var(--surface))] z-10">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Settings</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-secondary/60">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* General */}
          <Section icon={<Sliders className="h-3.5 w-3.5 text-primary" />} title="General">
            <Row label="Default mode" hint="Where new conversations start">
              <SegPill
                value={settings.defaultMode}
                options={[
                  { v: "relationship", label: "Polite" },
                  { v: "paid", label: "Fast" },
                ]}
                onChange={(v) => update({ defaultMode: v as Settings["defaultMode"] })}
              />
            </Row>
            <Row label="Animations" hint="Smooth transitions and pulses">
              <Switch checked={settings.animationsEnabled} onCheckedChange={(v) => update({ animationsEnabled: v })} />
            </Row>
          </Section>

          {/* Personalization */}
          <Section icon={<User className="h-3.5 w-3.5 text-primary" />} title="Personalization">
            <Row label="Communication style" hint="Subtle voice bias on every message">
              <div className="flex gap-1">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ communicationStyle: s })}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                      settings.communicationStyle === s
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Risk tolerance" hint="How fast to escalate">
              <div className="flex gap-1">
                {RISKS.map((r) => (
                  <button
                    key={r}
                    onClick={() => update({ riskTolerance: r })}
                    className={cn(
                      "text-[11px] px-2.5 py-1 rounded-md font-medium transition-all",
                      settings.riskTolerance === r
                        ? "bg-[hsl(var(--mode-accent)/0.15)] text-[hsl(var(--mode-accent))] border border-[hsl(var(--mode-accent)/0.3)]"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Row>
          </Section>

          {/* Follow-up */}
          <Section icon={<Bell className="h-3.5 w-3.5 text-primary" />} title="Follow-up">
            <Row label="Reminders" hint="Show banners when a follow-up is due">
              <Switch checked={settings.followUpEnabled} onCheckedChange={(v) => update({ followUpEnabled: v })} />
            </Row>
          </Section>

          {/* Privacy */}
          <Section icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />} title="Privacy">
            <Row label="Don't store messages" hint="Clears history on refresh">
              <Switch checked={settings.doNotStore} onCheckedChange={(v) => update({ doNotStore: v })} />
            </Row>
            <div className="pt-1">
              <Button
                onClick={onClearHistory}
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.06)] active:scale-[0.97]"
              >
                Clear all history
              </Button>
            </div>
          </Section>

          <p className="text-[10px] text-muted-foreground/70 text-center pt-2">
            Settings are saved to this browser only.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 px-1">
        {icon}
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>
      <div className="rounded-xl border border-border bg-card divide-y divide-border/60">
        {children}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SegPill<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center bg-secondary/60 rounded-md p-0.5 border border-border/40">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "text-[11px] font-semibold px-2.5 py-1 rounded transition-all",
            value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
