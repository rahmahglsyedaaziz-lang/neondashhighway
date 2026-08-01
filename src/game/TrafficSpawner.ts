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
  /** Lanes the player drives in — waves always leave one of these open. */
  playerLanes: number[];
  /** Lanes carrying traffic that drives toward the player (two-way only). */
  oncomingLanes: number[];
  laneX: (lane: number) => number;
  carW: number;
  carH: number;
  profile: DifficultyProfile;
  playerLane: number;
}

/**
 * Fairness-first traffic generation.
 * Rules enforced: never fills every player lane, keeps the open lane reachable
 * from the previous open lane, keeps vertical spacing per lane, and never
 * overlaps cars. Oncoming lanes are populated separately.
 */
export class TrafficSpawner {
  private pool: TrafficCar[] = [];
  private pickupPool: Pickup[] = [];
  private timer = 0;
  private oncomingTimer = 0;
  private lastOpenLane = 1;
  private lastPattern = "";

  reset() {
    this.pool.forEach((c) => (c.active = false));
    this.pickupPool.forEach((p) => (p.active = false));
    this.timer = 0;
    this.oncomingTimer = 0;
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
      kind: "car",
      oncoming: false,
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
    if (this.timer >= ctx.profile.spawnInterval) {
      this.timer = 0;
      this.spawnWave(ctx);
    }

    if (ctx.oncomingLanes.length) {
      this.oncomingTimer += dt * 1000;
      // Oncoming traffic is sparser: it closes distance much faster.
      if (this.oncomingTimer >= ctx.profile.spawnInterval * 1.15) {
        this.oncomingTimer = 0;
        this.spawnOncoming(ctx);
      }
    }
  }

  private spawnOncoming(ctx: SpawnContext) {
    const lane = ctx.oncomingLanes[Math.floor(Math.random() * ctx.oncomingLanes.length)];
    const minGap = ctx.carH * 2.6;
    const top = this.highestInLane(lane);
    if (top && top.y > -minGap) return;
    const car = this.obtain();
    const isTruck = Math.random() < ctx.profile.truckChance;
    const [color, accent] = isTruck
      ? (["#8ea0b5", "#e6eef7"] as [string, string])
      : PALETTE[Math.floor(Math.random() * PALETTE.length)];
    car.active = true;
    car.oncoming = true;
    car.kind = isTruck ? "truck" : "car";
    car.lane = lane;
    car.w = ctx.carW * (isTruck ? 1.02 : 1);
    car.h = ctx.carH * (isTruck ? 1.5 : 1);
    car.x = ctx.laneX(lane) - car.w / 2;
    car.y = -car.h - Math.random() * ctx.carH;
    car.speed = ctx.profile.speed * (isTruck ? 1.45 : 1.7);
    car.color = color;
    car.accent = accent;
    car.style = isTruck ? 1 : Math.floor(Math.random() * 3);
    car.scored = false;
    car.nearMissed = false;
  }

  private spawnWave(ctx: SpawnContext) {
    const { profile, playerLanes } = ctx;
    // Always keep at least one player lane open, and keep it reachable
    // (adjacent to the last open lane) so the gap can always be threaded.
    const reachable = playerLanes.filter((l) => Math.abs(l - this.lastOpenLane) <= 1);
    const pickFrom = reachable.length ? reachable : playerLanes;
    const openLane = pickFrom[Math.floor(Math.random() * pickFrom.length)];

    const candidates = playerLanes.filter((l) => l !== openLane);
    shuffle(candidates);

    const desired = Math.min(profile.maxCarsPerWave, Math.max(1, playerLanes.length - 1));
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
      const isTruck = Math.random() < profile.truckChance;
      const [color, accent] = isTruck
        ? (["#8ea0b5", "#e6eef7"] as [string, string])
        : PALETTE[Math.floor(Math.random() * PALETTE.length)];
      car.active = true;
      car.oncoming = false;
      car.kind = isTruck ? "truck" : "car";
      car.lane = lane;
      car.w = ctx.carW * (isTruck ? 1.02 : 1);
      car.h = ctx.carH * (isTruck ? 1.5 : 1);
      car.x = ctx.laneX(lane) - car.w / 2;
      car.y = -car.h - Math.random() * ctx.carH * 0.6 * profile.randomness;
      car.speed = profile.speed * (isTruck ? 0.88 : 1) * (1 + (Math.random() - 0.5) * 0.18 * profile.randomness);
      car.color = color;
      car.accent = accent;
      car.style = isTruck ? 1 : Math.floor(Math.random() * 3);
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
