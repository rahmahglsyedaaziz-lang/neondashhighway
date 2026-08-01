/**
 * Distance-driven difficulty. Ramping on distance (instead of raw score) keeps
 * the curve smooth now that near-miss bonuses can add large point chunks.
 */
export interface DifficultyProfile {
  level: number;
  /** Base traffic speed in world units per second. */
  speed: number;
  /** Milliseconds between spawn waves. */
  spawnInterval: number;
  /** Max cars that can be spawned in one wave (never all lanes). */
  maxCarsPerWave: number;
  /** 0..1 how much per-car speed/position randomness is applied. */
  randomness: number;
  /** 0..1 chance a spawned vehicle is a slower, longer truck. */
  truckChance: number;
}

const MAX_LEVEL = 12;
/** Meters of driving per difficulty level. */
const METERS_PER_LEVEL = 420;

export class DifficultyManager {
  /** Continuous progress (fractional levels) so speed ramps smoothly. */
  private progress = 0;
  /** Career levels start part-way up the curve. */
  private offset = 0;

  reset() {
    this.progress = this.offset;
  }

  /** Extra difficulty applied from the first meter (career mode). */
  setOffset(offset: number) {
    this.offset = Math.max(0, offset);
  }

  /** @param distanceM meters travelled in the current run. */
  update(distanceM: number) {
    this.progress = Math.min(MAX_LEVEL, this.offset + distanceM / METERS_PER_LEVEL);
    return this.currentLevel;
  }

  get currentLevel() {
    return Math.floor(this.progress);
  }

  get profile(): DifficultyProfile {
    const p = this.progress;
    const l = this.currentLevel;
    // Continuous +9% speed per level, compounding, capped by MAX_LEVEL.
    const speed = 260 * Math.pow(1.09, p);
    const spawnInterval = Math.max(450, 1500 - p * 88);
    const maxCarsPerWave = l >= 2 ? 2 : 1;
    const randomness = Math.min(1, 0.25 + p * 0.07);
    const truckChance = Math.min(0.3, Math.max(0, (p - 2) * 0.05));
    return { level: l, speed, spawnInterval, maxCarsPerWave, randomness, truckChance };
  }
}
