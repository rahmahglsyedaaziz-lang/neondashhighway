import { DifficultyManager } from "./DifficultyManager";
import { collides, nearMissGap } from "./CollisionManager";
import { SoundManager } from "./SoundManager";
import { TrafficSpawner } from "./TrafficSpawner";
import {
  SKIES,
  drawBackdrop,
  drawCar,
  drawParticles,
  drawPickup,
  drawRoad,
  drawSpeedLines,
} from "./render";
import type { GamePhase, HudState, NearMissEvent, Particle, PoliceUnit, Rect, RunStats } from "./types";

const LANES = 3;
const HS_KEY = "traffic-dodge:highscore";
const DAILY_KEY = "traffic-dodge:daily";
const ACH_KEY = "traffic-dodge:achievements";
const MUTE_KEY = "traffic-dodge:muted";

export const ACHIEVEMENTS = [
  { id: "first-blood", label: "Ignition", description: "Score your first point" },
  { id: "score-25", label: "Lane Surfer", description: "Reach 25 points" },
  { id: "score-50", label: "Asphalt Legend", description: "Reach 50 points" },
  { id: "combo-5", label: "Close Shave", description: "Chain a x5 near-miss combo" },
  { id: "coins-10", label: "Treasure Run", description: "Collect 10 coins in one run" },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readNumber(key: string) {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(key) ?? 0) || 0;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private time = 0;

  private width = 0;
  private height = 0;
  private roadX = 0;
  private roadW = 0;

  private difficulty = new DifficultyManager();
  private spawner = new TrafficSpawner();
  sound = new SoundManager();

  private particles: Particle[] = [];
  private scroll = 0;
  private shake = 0;
  private countdown = 0;

  private player: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private playerLane = 1;
  private targetLane = 1;
  private tilt = 0;

  private score = 0;
  private displayScore = 0;
  private highScore = 0;
  private dailyBest = 0;
  private combo = 0;
  private comboTimer = 0;
  private coins = 0;
  private boostMs = 0;
  private slowMs = 0;
  private crashed = false;
  private unlocked: string[] = [];

  /* near miss system */
  private nearMisses = 0;
  private bestCombo = 0;
  private nearMissEvent: NearMissEvent | null = null;
  private nearMissEventTimer = 0;
  private eventId = 0;
  private nearMissFlash = 0;
  private distanceM = 0;

  /* police pursuit */
  private police: PoliceUnit[] = [];
  private policeActive = false;
  private policeRemaining = 0;
  private policeCooldown = 20;
  private policeEscapes = 0;
  private policeEscapedFlash = 0;
  private sirenTimer = 0;
  private lastAchievement: string | null = null;

  phase: GamePhase = "menu";
  onHud: (s: HudState) => void = () => {};
  onRunEnd: (run: RunStats) => void = () => {};

  /** Cosmetics + light stat tuning coming from the garage. Defaults = original car. */
  private car = { color: "#00e5ff", accent: "#e9fdff", style: 2, handling: 6, acceleration: 5 };
  private runStart = 0;

  setCar(car: { color: string; accent: string; style: number; handling: number; acceleration: number }) {
    this.car = { ...car };
  }


  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.highScore = readNumber(HS_KEY);
    const daily = typeof window !== "undefined" ? window.localStorage.getItem(DAILY_KEY) : null;
    if (daily) {
      const parsed = JSON.parse(daily) as { date: string; score: number };
      this.dailyBest = parsed.date === todayKey() ? parsed.score : 0;
    }
    if (typeof window !== "undefined") {
      this.unlocked = JSON.parse(window.localStorage.getItem(ACH_KEY) ?? "[]") as string[];
      this.sound.setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
    }
    this.resize();
    this.loop(performance.now());
  }

  /* ---------- layout ---------- */

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.roadW = Math.min(this.width * 0.92, this.height * 0.62, 560);
    this.roadX = (this.width - this.roadW) / 2;
    const laneW = this.roadW / LANES;
    this.player.w = laneW * 0.6;
    this.player.h = this.player.w * 1.85;
    this.player.y = this.height - this.player.h - this.height * 0.09;
    this.player.x = this.laneX(this.playerLane) - this.player.w / 2;
  }

  private laneX(lane: number) {
    const laneW = this.roadW / LANES;
    return this.roadX + laneW * (lane + 0.5);
  }

  /* ---------- controls ---------- */

  move(dir: -1 | 1) {
    if (this.phase !== "playing") return;
    const next = Math.max(0, Math.min(LANES - 1, this.targetLane + dir));
    if (next === this.targetLane) return;
    this.targetLane = next;
    this.sound.laneSwitch();
    this.emitSmoke();
  }

  toggleMute() {
    const muted = !this.sound.muted;
    this.sound.setMuted(muted);
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    this.pushHud();
  }

  togglePause() {
    if (this.phase === "playing") {
      this.phase = "paused";
      this.sound.stopMusic();
      this.sound.setEngineIntensity(0);
    } else if (this.phase === "paused") {
      this.phase = "playing";
      this.sound.startMusic();
    }
    this.pushHud();
  }

  start() {
    this.sound.unlock();
    this.score = 0;
    this.displayScore = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.coins = 0;
    this.boostMs = 0;
    this.slowMs = 0;
    this.crashed = false;
    this.shake = 0;
    this.nearMisses = 0;
    this.bestCombo = 0;
    this.nearMissEvent = null;
    this.nearMissEventTimer = 0;
    this.nearMissFlash = 0;
    this.distanceM = 0;
    this.police.length = 0;
    this.policeActive = false;
    this.policeRemaining = 0;
    this.policeCooldown = 18 + Math.random() * 14;
    this.policeEscapes = 0;
    this.policeEscapedFlash = 0;
    this.sirenTimer = 0;
    this.particles.length = 0;
    this.playerLane = 1;
    this.targetLane = 1;
    this.tilt = 0;
    this.player.x = this.laneX(1) - this.player.w / 2;
    this.difficulty.reset();
    this.spawner.reset();
    this.countdown = 3.99;
    this.runStart = performance.now();

    this.phase = "countdown";
    this.lastAchievement = null;
    this.sound.startEngine();
    this.pushHud();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.sound.dispose();
  }

  /* ---------- loop ---------- */

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.render();
  };

  private get timeOfDay(): "day" | "sunset" | "night" {
    const lvl = this.difficulty.currentLevel;
    return lvl < 2 ? "day" : lvl < 5 ? "sunset" : "night";
  }

  private update(dt: number) {
    if (this.phase === "countdown") {
      const before = Math.ceil(this.countdown);
      this.countdown -= dt;
      const after = Math.ceil(this.countdown);
      if (after !== before && after >= 0) this.sound.countdownTick(after === 0);
      this.scroll += 120 * dt;
      if (this.countdown <= 0) {
        this.phase = "playing";
        this.sound.startMusic();
      }
      this.pushHud();
      return;
    }

    this.updateParticles(dt);

    if (this.phase !== "playing") {
      this.shake *= 0.9;
      return;
    }

    const base = this.difficulty.profile;
    // A pursuit raises the tempo a little, never to an unfair degree.
    const profile = this.policeActive
      ? { ...base, speed: base.speed * 1.12, spawnInterval: base.spawnInterval * 0.85 }
      : base;
    const slowFactor = this.slowMs > 0 ? 0.5 : 1;
    const boostFactor = this.boostMs > 0 ? 1.45 : 1;
    const worldSpeed = profile.speed * slowFactor * boostFactor;
    // ~10 canvas units per meter keeps distances in a believable range.
    this.distanceM += (worldSpeed * dt) / 10;
    this.updatePolice(dt);

    this.boostMs = Math.max(0, this.boostMs - dt * 1000);
    this.slowMs = Math.max(0, this.slowMs - dt * 1000);
    this.scroll += worldSpeed * dt;
    this.sound.setEngineIntensity(Math.min(1, this.difficulty.currentLevel / 8 + (this.boostMs > 0 ? 0.3 : 0)));

    // player lane interpolation with tilt
    const targetX = this.laneX(this.targetLane) - this.player.w / 2;
    const dx = targetX - this.player.x;
    this.player.x += dx * Math.min(1, dt * (11 + this.car.handling * 0.35));
    this.tilt = Math.max(-0.22, Math.min(0.22, dx / (this.player.w * 2.6)));
    if (Math.abs(dx) < 1) this.playerLane = this.targetLane;
    if (Math.abs(dx) > this.player.w * 0.15 && Math.random() < 0.4) this.emitSmoke();

    this.spawner.update(dt, {
      laneCount: LANES,
      laneX: (l) => this.laneX(l),
      carW: this.player.w,
      carH: this.player.h,
      profile,
      playerLane: this.targetLane,
    });

    for (const car of this.spawner.cars) {
      if (!car.active) continue;
      car.y += (car.speed * slowFactor * boostFactor) * dt;

      // Each vehicle can only ever award one near miss (car.nearMissed latch).
      if (!car.nearMissed) {
        const threshold = this.player.w * 0.45;
        const gap = nearMissGap(this.player, car);
        if (gap >= 0 && gap < threshold) {
          car.nearMissed = true;
          this.registerNearMiss(car.x + car.w / 2, car.y + car.h / 2, 1 - gap / threshold);
        }
      }

      if (collides(this.player, car)) {
        this.crash();
        return;
      }

      if (!car.scored && car.y > this.height) {
        car.scored = true;
        this.score += 1;
      }
      if (car.y > this.height + car.h) car.active = false;
    }

    for (const p of this.spawner.pickups) {
      if (!p.active) continue;
      p.y += worldSpeed * dt;
      p.spin += dt * 5;
      if (
        p.x < this.player.x + this.player.w &&
        p.x + p.w > this.player.x &&
        p.y < this.player.y + this.player.h &&
        p.y + p.h > this.player.y
      ) {
        p.active = false;
        if (p.kind === "coin") {
          this.coins += 1;
          this.score += 2;
          this.sound.coin();
          this.emitSparks(p.x + p.w / 2, p.y + p.h / 2, 12, "#ffd400");
        } else if (p.kind === "boost") {
          this.boostMs = 3500;
          this.sound.powerup();
          this.emitSparks(p.x + p.w / 2, p.y + p.h / 2, 14, "#00ff9d");
        } else {
          this.slowMs = 4000;
          this.sound.powerup();
          this.emitSparks(p.x + p.w / 2, p.y + p.h / 2, 14, "#00e5ff");
        }
      }
      if (p.y > this.height + p.h) p.active = false;
    }

    this.comboTimer -= dt;
    if (this.comboTimer <= 0 && this.combo > 0) this.combo = 0;

    this.difficulty.update(this.distanceM);
    this.displayScore += (this.score - this.displayScore) * Math.min(1, dt * 9);
    if (Math.abs(this.score - this.displayScore) < 0.5) this.displayScore = this.score;
    this.shake *= 0.88;
    this.nearMissFlash = Math.max(0, this.nearMissFlash - dt * 2.2);
    if (this.nearMissEvent) {
      this.nearMissEventTimer -= dt;
      if (this.nearMissEventTimer <= 0) this.nearMissEvent = null;
    }
    if (this.policeEscapedFlash > 0) this.policeEscapedFlash = Math.max(0, this.policeEscapedFlash - dt);
    this.checkAchievements();
    this.pushHud();
  }

  private crash() {
    this.crashed = true;
    this.phase = "gameover";
    // A crash always wipes the running near miss combo.
    this.combo = 0;
    this.comboTimer = 0;
    this.nearMissEvent = null;
    this.policeActive = false;
    this.police.length = 0;
    this.shake = 26;
    this.sound.crash();
    this.sound.stopMusic();
    this.sound.stopEngine();
    this.emitSparks(this.player.x + this.player.w / 2, this.player.y, 60, "#ff7a18");
    this.emitSparks(this.player.x + this.player.w / 2, this.player.y, 30, "#ffd400");

    if (this.score > this.highScore) {
      this.highScore = this.score;
      window.localStorage.setItem(HS_KEY, String(this.score));
    }
    if (this.score > this.dailyBest) {
      this.dailyBest = this.score;
      window.localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), score: this.score }));
    }
    this.displayScore = this.score;
    this.pushHud();
    this.onRunEnd({
      score: this.score,
      coins: this.coins,
      durationMs: Math.max(0, Math.round(performance.now() - this.runStart)),
      nearMisses: this.nearMisses,
      bestCombo: this.bestCombo,
      distanceM: Math.round(this.distanceM),
      policeEscapes: this.policeEscapes,
    });
  }


  /* ---------- near miss ---------- */

  /** @param intensity 0..1, 1 = paint-scraping close. */
  private registerNearMiss(x: number, y: number, intensity: number) {
    this.combo += 1;
    this.comboTimer = 3;
    this.nearMisses += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    const points = 100 * Math.min(this.combo, 10);
    this.score += points;

    this.eventId += 1;
    this.nearMissEvent = { id: this.eventId, points, combo: this.combo, intensity };
    this.nearMissEventTimer = 1.1;
    this.nearMissFlash = Math.min(1, 0.35 + intensity * 0.65);
    this.shake = Math.max(this.shake, 3 + intensity * 5);

    this.sound.nearMissHit(this.combo, intensity);
    this.emitSparks(x, y, 8 + Math.round(intensity * 14), intensity > 0.6 ? "#ffd400" : "#00e5ff");
  }

  /* ---------- police pursuit ---------- */

  private updatePolice(dt: number) {
    if (!this.policeActive) {
      this.policeCooldown -= dt;
      // Random pursuits keep every run different, but only once the player is rolling.
      if (this.policeCooldown <= 0 && this.distanceM > 700 && Math.random() < dt * 0.08) {
        this.startPursuit();
      }
      return;
    }

    this.policeRemaining -= dt;
    this.sirenTimer -= dt;
    if (this.sirenTimer <= 0) {
      this.sirenTimer = 1.1;
      this.sound.sirenWail();
    }

    // Cruisers weave behind the player. They never collide, so a pursuit adds
    // pressure and spectacle without ever becoming an unavoidable death.
    for (const unit of this.police) {
      unit.laneTimer -= dt;
      if (unit.laneTimer <= 0) {
        unit.laneTimer = 0.5 + Math.random() * 0.7;
        const drift = Math.random() < 0.65 ? this.targetLane : Math.floor(Math.random() * LANES);
        unit.targetLane = Math.max(0, Math.min(LANES - 1, drift));
      }
      const tx = this.laneX(unit.targetLane) - unit.w / 2;
      unit.x += (tx - unit.x) * Math.min(1, dt * 5);
      const ty = this.height - unit.h * (0.55 + 0.25 * Math.sin(this.time * 1.6 + unit.lane));
      unit.y += (ty - unit.y) * Math.min(1, dt * 2.2);
    }

    if (this.policeRemaining <= 0) this.endPursuit();
  }

  private startPursuit() {
    this.policeActive = true;
    this.policeRemaining = 30;
    this.sirenTimer = 0;
    this.police = [0, 1].map((i) => ({
      lane: this.targetLane,
      targetLane: this.targetLane,
      laneTimer: 0.3 + i * 0.4,
      w: this.player.w,
      h: this.player.h,
      x: this.laneX(this.targetLane) - this.player.w / 2,
      y: this.height + this.player.h * (1 + i * 0.6),
    }));
    this.sound.policeStart();
  }

  private endPursuit() {
    this.policeActive = false;
    this.police.length = 0;
    this.policeEscapes += 1;
    this.policeEscapedFlash = 3;
    this.score += 1500;
    this.sound.escaped();
    this.emitSparks(this.player.x + this.player.w / 2, this.player.y, 30, "#00ff9d");
  }

  private checkAchievements() {
    const unlock = (id: string) => {
      if (this.unlocked.includes(id)) return;
      this.unlocked = [...this.unlocked, id];
      this.lastAchievement = ACHIEVEMENTS.find((a) => a.id === id)?.label ?? id;
      window.localStorage.setItem(ACH_KEY, JSON.stringify(this.unlocked));
      window.setTimeout(() => {
        this.lastAchievement = null;
        this.pushHud();
      }, 2600);
    };
    if (this.score >= 1) unlock("first-blood");
    if (this.score >= 25) unlock("score-25");
    if (this.score >= 50) unlock("score-50");
    if (this.combo >= 5) unlock("combo-5");
    if (this.coins >= 10) unlock("coins-10");
  }

  /* ---------- particles ---------- */

  private emitSparks(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 340;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.6,
        maxLife: 1.1,
        size: 2 + Math.random() * 4,
        color,
        kind: "spark",
      });
    }
  }

  private emitSmoke() {
    const x = this.player.x + this.player.w / 2;
    const y = this.player.y + this.player.h * 0.9;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * this.player.w,
        y,
        vx: (Math.random() - 0.5) * 40,
        vy: 60 + Math.random() * 90,
        life: 0.45,
        maxLife: 0.45,
        size: 4 + Math.random() * 5,
        color: "#9fb4c9",
        kind: "smoke",
      });
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 240 * dt;
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  /* ---------- render ---------- */

  private render() {
    const ctx = this.ctx;
    const sky = SKIES[this.timeOfDay];
    ctx.save();
    if (this.shake > 0.4) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawBackdrop(ctx, this.width, this.height, this.roadX, this.roadW, sky);
    const neon = this.timeOfDay === "night" ? "#00e5ff" : this.timeOfDay === "sunset" ? "#ff2d6f" : "#7dfcd6";
    drawRoad(ctx, this.height, this.roadX, this.roadW, LANES, this.scroll, neon, this.boostMs > 0);
    drawSpeedLines(ctx, this.width, this.height, this.time, this.boostMs > 0 ? 0.6 : this.difficulty.currentLevel / 20);

    for (const p of this.spawner.pickups) if (p.active) drawPickup(ctx, p);

    for (const car of this.spawner.cars) {
      if (!car.active) continue;
      drawCar(ctx, car, car.color, car.accent, car.style, { headlights: false });
    }

    for (const unit of this.police) {
      const flash = Math.floor(this.time * 8) % 2 === 0;
      drawCar(ctx, unit, "#0f1a3a", "#e8ecff", 0, { glow: flash ? "#2f6bff" : "#ff2d4f" });
      ctx.save();
      ctx.fillStyle = flash ? "#2f6bff" : "#ff2d4f";
      ctx.shadowColor = ctx.fillStyle as string;
      ctx.shadowBlur = 22;
      ctx.fillRect(unit.x + unit.w * 0.18, unit.y + unit.h * 0.12, unit.w * 0.64, unit.h * 0.07);
      ctx.restore();
    }

    if (!this.crashed) {
      drawCar(ctx, this.player, this.car.color, this.car.accent, this.car.style, {
        tilt: this.tilt,
        headlights: true,
        glow: this.boostMs > 0 ? "#00ff9d" : this.car.color,
      });

    }

    drawParticles(ctx, this.particles);

    if (this.nearMissFlash > 0) {
      ctx.fillStyle = `rgba(255,212,0,${(this.nearMissFlash * 0.1).toFixed(3)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.policeActive) {
      const pulse = (Math.sin(this.time * 7) + 1) / 2;
      ctx.fillStyle = `rgba(${pulse > 0.5 ? "47,107,255" : "255,45,79"},0.07)`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.slowMs > 0) {
      ctx.fillStyle = "rgba(0,229,255,0.08)";
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  /* ---------- hud ---------- */

  private pushHud() {
    this.onHud({
      phase: this.phase,
      score: Math.round(this.displayScore),
      highScore: this.highScore,
      dailyBest: this.dailyBest,
      level: this.difficulty.currentLevel + 1,
      combo: this.combo,
      coins: this.coins,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      muted: this.sound.muted,
      boostMs: this.boostMs,
      slowMs: this.slowMs,
      timeOfDay: this.timeOfDay,
      unlocked: this.unlocked,
      lastAchievement: this.lastAchievement,
      nearMisses: this.nearMisses,
      bestCombo: this.bestCombo,
      nearMissEvent: this.nearMissEvent,
      distanceM: Math.round(this.distanceM),
      policeActive: this.policeActive,
      policeRemaining: Math.max(0, Math.ceil(this.policeRemaining)),
      policeEscapedFlash: this.policeEscapedFlash > 0,
      policeEscapes: this.policeEscapes,
    });
  }

  get finalScore() {
    return this.score;
  }
}
