const OUTCOMES_KEY = "solenq-outcomes";
const STREAK_KEY = "solenq-streak";

export interface OutcomeRecord {
  id: string;
  date: number;
  situation: string;
  rating: 1 | 2 | 3;
  mode: string;
  conversationId?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalHandled: number;
  totalRated: number;
}

export interface Stats {
  currentStreak: number;
  longestStreak: number;
  totalHandled: number;
  totalRated: number;
  responseRate: number;
  averageScore: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function loadOutcomes(): OutcomeRecord[] {
  try {
    return JSON.parse(localStorage.getItem(OUTCOMES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveOutcomes(outcomes: OutcomeRecord[]) {
  try {
    localStorage.setItem(OUTCOMES_KEY, JSON.stringify(outcomes));
  } catch {/* ignore */}
}

export function saveOutcome(record: OutcomeRecord) {
  const all = loadOutcomes();
  all.push(record);
  saveOutcomes(all);
}

export function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalHandled: 0, totalRated: 0 };
    return JSON.parse(raw);
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: null, totalHandled: 0, totalRated: 0 };
  }
}

function saveStreak(data: StreakData) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(data));
  } catch {/* ignore */}
}

function touchStreak(data: StreakData): StreakData {
  const today = todayStr();
  const yesterday = yesterdayStr();
  if (data.lastActiveDate === today) {
    // already active today
  } else if (data.lastActiveDate === yesterday) {
    data.currentStreak += 1;
  } else {
    data.currentStreak = 1;
  }
  if (data.currentStreak > data.longestStreak) {
    data.longestStreak = data.currentStreak;
  }
  data.lastActiveDate = today;
  return data;
}

export function recordHandled(): StreakData {
  const data = loadStreak();
  data.totalHandled += 1;
  const updated = touchStreak(data);
  saveStreak(updated);
  return updated;
}

export function recordRated(): StreakData {
  const data = loadStreak();
  data.totalRated += 1;
  touchStreak(data);
  saveStreak(data);
  return data;
}

export function isStreakAtRisk(): boolean {
  const data = loadStreak();
  if (!data.lastActiveDate || data.currentStreak === 0) return false;
  const today = todayStr();
  const yesterday = yesterdayStr();
  return data.lastActiveDate !== today && data.lastActiveDate === yesterday;
}

export function getStats(): Stats {
  const data = loadStreak();
  const outcomes = loadOutcomes();
  const totalRated = outcomes.length;
  const avgScore = totalRated > 0
    ? outcomes.reduce((sum, o) => sum + o.rating, 0) / totalRated
    : 0;
  const responded = outcomes.filter((o) => o.rating <= 2).length;
  const responseRate = totalRated > 0 ? Math.round((responded / totalRated) * 100) : 0;
  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    totalHandled: data.totalHandled,
    totalRated,
    responseRate,
    averageScore: Math.round(avgScore * 10) / 10,
  };
}
