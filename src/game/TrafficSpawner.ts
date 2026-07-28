import type { DifficultyProfile } from "./DifficultyManager";
import type { Pickup, PickupKind, TrafficCar } from "./types";

const PALETTE: Array<[string, string]> = [
  ["#ff2d6f", "#ffd1e0"],
  ["#00e5ff", "#d7fbff"],
  ["#ffd400", "#fff3b0"],
  ["#7c4dff", "#e0d4ff"],
  ["#00ff9d", "#d2ffee"],
  ["#ff7a18", "#ffe0c2"],
  ["#f5f7ff", "#c8ccdd"],
];

export interface SpawnContext {
  laneCount: number;
  laneX: (lane: number) => number;
  carW: number;
  carH: number;
  profile: DifficultyProfile;
  playerLane: number;
}

/**
 * Fairness-first traffic generation.
 * Rules enforced: never fills every lane, keeps the open lane reachable from the
 * previous open lane, keeps vertical spacing per lane, and never overlaps cars.
 */
export class TrafficSpawner {
  private pool: TrafficCar[] = [];
  private pickupPool: Pickup[] = [];
  private timer = 0;
  private lastOpenLane = 1;
  private lastPattern = "";

  reset() {
    this.pool.forEach((c) => (c.active = false));
    this.pickupPool.forEach((p) => (p.active = false));
    this.timer = 0;
    this.lastOpenLane = 1;
    this.lastPattern = "";
  }

  get cars() {
    return this.pool;
  }

  get pickups() {
    return this.pickupPool;
  }

  private obtain(): TrafficCar {
    const recycled = this.pool.find((c) => !c.active);
    if (recycled) return recycled;
    const car: TrafficCar = {
      active: false,
      lane: 0,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      speed: 0,
      color: "#fff",
      accent: "#fff",
      style: 0,
      scored: false,
      nearMissed: false,
    };
    this.pool.push(car);
    return car;
  }

  private obtainPickup(): Pickup {
    const recycled = this.pickupPool.find((p) => !p.active);
    if (recycled) return recycled;
    const p: Pickup = { active: false, lane: 0, x: 0, y: 0, w: 0, h: 0, kind: "coin", spin: 0 };
    this.pickupPool.push(p);
    return p;
  }

  /** Topmost (smallest y) active car in a lane, or null. */
  private highestInLane(lane: number): TrafficCar | null {
    let best: TrafficCar | null = null;
    for (const c of this.pool) {
      if (c.active && c.lane === lane && (!best || c.y < best.y)) best = c;
    }
    return best;
  }

  update(dt: number, ctx: SpawnContext) {
    this.timer += dt * 1000;
    if (this.timer < ctx.profile.spawnInterval) return;
    this.timer = 0;
    this.spawnWave(ctx);
  }

  private spawnWave(ctx: SpawnContext) {
    const { laneCount, profile } = ctx;
    // Always keep at least one lane open, and keep it reachable (adjacent to the
    // last open lane) so the player can always thread the gap in time.
    const reachable: number[] = [];
    for (let l = 0; l < laneCount; l++) {
      if (Math.abs(l - this.lastOpenLane) <= 1) reachable.push(l);
    }
    const openLane = reachable[Math.floor(Math.random() * reachable.length)];

    const candidates: number[] = [];
    for (let l = 0; l < laneCount; l++) if (l !== openLane) candidates.push(l);
    shuffle(candidates);

    const desired = Math.min(profile.maxCarsPerWave, laneCount - 1);
    let count = 1 + (Math.random() < 0.35 + profile.randomness * 0.4 ? desired - 1 : 0);
    count = Math.max(1, Math.min(count, candidates.length));

    // Avoid replaying the exact same pattern twice in a row.
    const pattern = `${openLane}:${candidates.slice(0, count).sort().join(",")}`;
    if (pattern === this.lastPattern && candidates.length > count) {
      shuffle(candidates);
    }
    this.lastPattern = pattern;

    const minGap = ctx.carH * 1.9;
    let spawned = 0;
    for (let i = 0; i < count; i++) {
      const lane = candidates[i];
      const top = this.highestInLane(lane);
      // Maintain safe vertical spacing so cars never overlap or stack unfairly.
      if (top && top.y > -minGap) continue;
      const car = this.obtain();
      const [color, accent] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      car.active = true;
      car.lane = lane;
      car.w = ctx.carW;
      car.h = ctx.carH;
      car.x = ctx.laneX(lane) - ctx.carW / 2;
      car.y = -ctx.carH - Math.random() * ctx.carH * 0.6 * profile.randomness;
      car.speed = profile.speed * (1 + (Math.random() - 0.5) * 0.18 * profile.randomness);
      car.color = color;
      car.accent = accent;
      car.style = Math.floor(Math.random() * 3);
      car.scored = false;
      car.nearMissed = false;
      spawned++;
    }

    this.lastOpenLane = openLane;

    // Collectibles always ride the guaranteed-open lane, so chasing them is safe.
    if (spawned > 0 && Math.random() < 0.35) {
      const kind: PickupKind =
        Math.random() < 0.7 ? "coin" : Math.random() < 0.5 ? "boost" : "slowmo";
      const p = this.obtainPickup();
      p.active = true;
      p.lane = openLane;
      p.kind = kind;
      p.w = ctx.carW * 0.45;
      p.h = ctx.carW * 0.45;
      p.x = ctx.laneX(openLane) - p.w / 2;
      p.y = -p.h - ctx.carH * 0.5;
      p.spin = 0;
    }
  }
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
