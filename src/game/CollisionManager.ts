import type { Rect } from "./types";

/** Shrunken bounding boxes approximate the car silhouette closely. */
const INSET_X = 0.16;
const INSET_Y = 0.1;

export function hitboxOf(r: Rect): Rect {
  const dx = r.w * INSET_X;
  const dy = r.h * INSET_Y;
  return { x: r.x + dx, y: r.y + dy, w: r.w - dx * 2, h: r.h - dy * 2 };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function collides(a: Rect, b: Rect): boolean {
  return intersects(hitboxOf(a), hitboxOf(b));
}

/** True when boxes overlap vertically and are laterally close without touching. */
export function isNearMiss(player: Rect, car: Rect, threshold: number): boolean {
  const verticalOverlap = player.y < car.y + car.h && player.y + player.h > car.y;
  if (!verticalOverlap) return false;
  const gap = Math.abs(player.x + player.w / 2 - (car.x + car.w / 2)) - (player.w + car.w) / 2;
  return gap > 0 && gap < threshold;
}

/**
 * Lateral gap between player and car while they overlap vertically.
 * Returns -1 when they are not side by side (or already touching).
 */
export function nearMissGap(player: Rect, car: Rect): number {
  const verticalOverlap = player.y < car.y + car.h && player.y + player.h > car.y;
  if (!verticalOverlap) return -1;
  const gap = Math.abs(player.x + player.w / 2 - (car.x + car.w / 2)) - (player.w + car.w) / 2;
  return gap > 0 ? gap : -1;
}
