export interface MapBranch {
  tag: string;
  action: string;
}

export interface MapResult {
  opening: string;
  coreMessage: string;
  branches: MapBranch[];
  doNotSay: string;
  reminder: string;
}

export interface SavedMap {
  id: string;
  date: number;
  answers: { q1: string; q2: string; q3: string };
  map: MapResult;
}

const KEY = "solenq-maps";

export function loadMaps(): SavedMap[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMap(entry: SavedMap): void {
  try {
    const existing = loadMaps();
    localStorage.setItem(KEY, JSON.stringify([entry, ...existing].slice(0, 20)));
  } catch {
    /* ignore */
  }
}
