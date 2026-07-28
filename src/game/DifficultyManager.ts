/** Difficulty scales every 10 points and is capped so the game stays fair. */
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
}

const MAX_LEVEL = 12;

export class DifficultyManager {
  private level = 0;

  reset() {
    this.level = 0;
  }

  update(score: number) {
    this.level = Math.min(MAX_LEVEL, Math.floor(score / 10));
    return this.level;
  }

  get currentLevel() {
    return this.level;
  }

  get profile(): DifficultyProfile {
    const l = this.level;
    // +10% speed per level, compounding, capped by MAX_LEVEL.
    const speed = 260 * Math.pow(1.1, l);
    const spawnInterval = Math.max(430, 1500 - l * 95);
    const maxCarsPerWave = l >= 4 ? 2 : l >= 2 ? 2 : 1;
    const randomness = Math.min(1, 0.25 + l * 0.08);
    return { level: l, speed, spawnInterval, maxCarsPerWave, randomness };
  }
}
