export type GamePhase = "menu" | "countdown" | "playing" | "paused" | "gameover";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TrafficKind = "car" | "truck";

export interface TrafficCar extends Rect {
  active: boolean;
  lane: number;
  speed: number;
  color: string;
  accent: string;
  style: number;
  scored: boolean;
  nearMissed: boolean;
  kind: TrafficKind;
}

export interface PoliceUnit extends Rect {
  lane: number;
  targetLane: number;
  laneTimer: number;
}

export interface NearMissEvent {
  id: number;
  points: number;
  combo: number;
  /** 0..1 — how close the graze was (1 = paint-scraping). */
  intensity: number;
}

export interface RunStats {
  score: number;
  coins: number;
  durationMs: number;
  nearMisses: number;
  bestCombo: number;
  distanceM: number;
  policeEscapes: number;
}


export type PickupKind = "coin" | "boost" | "slowmo";

export interface Pickup extends Rect {
  active: boolean;
  lane: number;
  kind: PickupKind;
  spin: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "spark" | "smoke";
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
}

export interface HudState {
  phase: GamePhase;
  score: number;
  highScore: number;
  dailyBest: number;
  level: number;
  combo: number;
  coins: number;
  countdown: number;
  muted: boolean;
  boostMs: number;
  slowMs: number;
  timeOfDay: "day" | "sunset" | "night";
  unlocked: string[];
  lastAchievement: string | null;
  /** Near miss system */
  nearMisses: number;
  bestCombo: number;
  nearMissEvent: NearMissEvent | null;
  /** Distance travelled this run, in meters. */
  distanceM: number;
  /** Police pursuit */
  policeActive: boolean;
  policeRemaining: number;
  policeEscapedFlash: boolean;
  policeEscapes: number;

}
