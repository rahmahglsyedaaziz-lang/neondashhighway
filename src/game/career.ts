/** Career mode: 35 hand-tuned levels built from one gentle progression curve. */

export const CAREER_LEVEL_COUNT = 35;

export interface CareerLevel {
  level: number;
  /** Meters the player must survive to complete the level. */
  targetM: number;
  /** Extra starting difficulty (in difficulty levels) for this run. */
  difficultyOffset: number;
  /** Traffic layout used by the level. */
  traffic: "oneway" | "twoway";
  /** True when finishing this level unlocks a garage car. */
  reward: boolean;
}

/** Levels that hand out a car from the existing garage catalogue. */
export const CAREER_REWARD_LEVELS = [5, 10, 15, 20, 25, 30, 35];

export const CAREER_LEVELS: CareerLevel[] = Array.from(
  { length: CAREER_LEVEL_COUNT },
  (_, i): CareerLevel => {
    const level = i + 1;
    return {
      level,
      targetM: 450 + i * 135,
      difficultyOffset: i * 0.3,
      // Two-way traffic joins the campaign from level 12 onward.
      traffic: level >= 12 ? "twoway" : "oneway",
      reward: CAREER_REWARD_LEVELS.includes(level),
    };
  },
);

export function getCareerLevel(level: number): CareerLevel {
  return CAREER_LEVELS[Math.max(0, Math.min(CAREER_LEVEL_COUNT - 1, level - 1))];
}

const LOCAL_KEY = "traffic-dodge:career";

/** Guest progress mirror so career works before signing in. */
export function getLocalCareer(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

export function addLocalCareer(level: number) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...getLocalCareer(), level])).sort((a, b) => a - b);
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
}

/** Highest level the player may start (completed max + 1, capped at 35). */
export function highestUnlocked(completed: number[]) {
  const max = completed.length ? Math.max(...completed) : 0;
  return Math.min(CAREER_LEVEL_COUNT, max + 1);
}
