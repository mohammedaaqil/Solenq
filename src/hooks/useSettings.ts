import { useEffect, useState, useCallback } from "react";
import type { Mode } from "@/components/ModeToggle";

export interface Settings {
  defaultMode: Mode;
  animationsEnabled: boolean;
  communicationStyle: "Friendly" | "Professional" | "Assertive";
  riskTolerance: "Low" | "Medium" | "High";
  doNotStore: boolean;
  followUpEnabled: boolean;
}

const DEFAULTS: Settings = {
  defaultMode: "relationship",
  animationsEnabled: true,
  communicationStyle: "Professional",
  riskTolerance: "Medium",
  doNotStore: false,
  followUpEnabled: true,
};

const KEY = "solenq-settings";

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    setSettings(load());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {/* ignore */}
      return next;
    });
  }, []);

  return { settings, update };
}
