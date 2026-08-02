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
  /** True when the car drives toward the player (two-way traffic). */
  oncoming: boolean;
}

export interface PoliceUnit extends Rect {
  lane: number;
  targetLane: number;
  laneTimer: number;
}

/** A police cruiser driving in normal traffic; may escalate into a pursuit. */
export interface PatrolCar extends Rect {
  active: boolean;
  lane: number;
  speed: number;
  /** Seconds left before this patrol rolls again for escalation. */
  rollTimer: number;
  escalated: boolean;
}

/** An off-ramp on the side of the highway. Taking it ends an active pursuit. */
export interface HighwayExit {
  active: boolean;
  y: number;
  h: number;
  lane: number;
  side: "left" | "right";
  taken: boolean;
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
  /** True right after a pursuit begins (banner flash). */
  pursuitStartFlash: boolean;
  /** An off-ramp is on screen and reachable. */
  exitAvailable: boolean;
  /** Which side the on-screen exit is on. */
  exitSide: "left" | "right" | null;
  /** Career vs infinity run. */
  gameMode: "career" | "infinity";
  /** Traffic layout of the current run. */
  trafficMode: "oneway" | "twoway";
  /** Career level being played (0 in infinity mode). */
  careerLevel: number;
  /** Meters required to clear the current career level. */
  careerTargetM: number;
  /** True when the last run ended by clearing a career level. */
  careerComplete: boolean;
  /** Current map the player is driving on (exits switch maps mid-run). */
  mapName: string;
  mapTagline: string;
  mapIndex: number;
  /** True while the exit → new map camera transition is playing. */
  mapTransition: boolean;
  /** Brief "new map" banner right after arriving. */
  mapFlash: boolean;
}
