import type { HighwayExit, Particle, Pickup, Rect } from "./types";

/** Neon off-ramp painted on the shoulder; taking it during a chase = escape. */
export function drawExit(
  ctx: CanvasRenderingContext2D,
  e: HighwayExit,
  roadX: number,
  roadW: number,
  time: number,
  urgent: boolean,
) {
  const w = Math.max(26, roadW * 0.16);
  const x = e.side === "left" ? roadX - w * 0.85 : roadX + roadW - w * 0.15;
  const color = urgent ? "#00ff9d" : "#7dfcd6";
  const pulse = 0.55 + 0.45 * ((Math.sin(time * 5) + 1) / 2);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20 * pulse;
  ctx.globalAlpha = 0.18 * pulse + 0.12;
  ctx.fillRect(x, e.y, w, e.h);
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.strokeRect(x, e.y, w, e.h);

  ctx.translate(x + w / 2, e.y + e.h / 2);
  ctx.rotate(e.side === "left" ? -Math.PI / 2 : Math.PI / 2);
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(w * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EXIT ▲", 0, 0);
  ctx.restore();
}

export interface Sky {
  top: string;
  bottom: string;
  road: string;
  shoulder: string;
}

export const SKIES: Record<"day" | "sunset" | "night", Sky> = {
  day: { top: "#123047", bottom: "#1d4f63", road: "#1b2430", shoulder: "#0f1720" },
  sunset: { top: "#3b1450", bottom: "#7a2350", road: "#1a1524", shoulder: "#120e1a" },
  night: { top: "#05060f", bottom: "#0b1026", road: "#0d1018", shoulder: "#070910" },
};

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  roadX: number,
  roadW: number,
  sky: Sky,
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, sky.top);
  g.addColorStop(1, sky.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = sky.shoulder;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = sky.road;
  ctx.fillRect(roadX, 0, roadW, h);
}

export function drawRoad(
  ctx: CanvasRenderingContext2D,
  h: number,
  roadX: number,
  roadW: number,
  laneCount: number,
  scroll: number,
  neon: string,
  boosting: boolean,
  /** Lane boundary index that separates opposing traffic (two-way), or null. */
  dividerIndex: number | null = null,
) {
  const laneW = roadW / laneCount;
  const dash = h * 0.11;
  const gap = dash * 0.85;

  ctx.save();
  ctx.strokeStyle = neon;
  ctx.shadowColor = neon;
  ctx.shadowBlur = boosting ? 26 : 14;
  ctx.lineWidth = Math.max(3, roadW * 0.012);
  ctx.lineCap = "round";

  for (let i = 1; i < laneCount; i++) {
    if (i === dividerIndex) continue;
    const x = roadX + laneW * i;
    let y = (scroll % (dash + gap)) - (dash + gap);
    while (y < h) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + dash);
      ctx.stroke();
      y += dash + gap;
    }
  }

  ctx.lineWidth = Math.max(4, roadW * 0.016);
  ctx.shadowBlur = boosting ? 34 : 20;
  ctx.beginPath();
  ctx.moveTo(roadX, 0);
  ctx.lineTo(roadX, h);
  ctx.moveTo(roadX + roadW, 0);
  ctx.lineTo(roadX + roadW, h);
  ctx.stroke();

  // Solid double centre line: makes the two traffic directions unmistakable.
  if (dividerIndex !== null) {
    const cx = roadX + laneW * dividerIndex;
    const off = Math.max(2.5, roadW * 0.008);
    ctx.strokeStyle = "#ffd400";
    ctx.shadowColor = "#ffd400";
    ctx.shadowBlur = 18;
    ctx.lineWidth = Math.max(2.5, roadW * 0.007);
    ctx.beginPath();
    ctx.moveTo(cx - off, 0);
    ctx.lineTo(cx - off, h);
    ctx.moveTo(cx + off, 0);
    ctx.lineTo(cx + off, h);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCar(
  ctx: CanvasRenderingContext2D,
  r: Rect,
  color: string,
  accent: string,
  style: number,
  opts: { tilt?: number; headlights?: boolean; glow?: string } = {},
  opts: { tilt?: number; headlights?: boolean; glow?: string; flip?: boolean } = {},
) {
  const { x, y, w, h } = r;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (opts.flip) ctx.rotate(Math.PI);
  if (opts.tilt) ctx.rotate(opts.tilt);
  ctx.translate(-w / 2, -h / 2);

  const glow = opts.glow ?? color;
  ctx.shadowColor = glow;
  ctx.shadowBlur = w * 0.5;

  // body
  const body = ctx.createLinearGradient(0, 0, w, h);
  body.addColorStop(0, color);
  body.addColorStop(1, shade(color, -35));
  ctx.fillStyle = body;
  roundRect(ctx, w * 0.06, 0, w * 0.88, h, w * 0.24);
  ctx.fill();
  ctx.shadowBlur = 0;

  // cabin
  ctx.fillStyle = "rgba(10,16,26,0.82)";
  roundRect(ctx, w * 0.17, h * (style === 1 ? 0.24 : 0.2), w * 0.66, h * 0.32, w * 0.14);
  ctx.fill();

  // rear window / hood stripe
  ctx.fillStyle = "rgba(10,16,26,0.55)";
  roundRect(ctx, w * 0.2, h * 0.66, w * 0.6, h * 0.18, w * 0.1);
  ctx.fill();

  ctx.fillStyle = accent;
  if (style === 2) {
    ctx.fillRect(w * 0.46, h * 0.06, w * 0.08, h * 0.86);
  } else {
    ctx.fillRect(w * 0.14, h * 0.56, w * 0.72, h * 0.03);
  }

  // wheels
  ctx.fillStyle = "#0a0d14";
  roundRect(ctx, 0, h * 0.16, w * 0.1, h * 0.2, w * 0.05);
  ctx.fill();
  roundRect(ctx, w * 0.9, h * 0.16, w * 0.1, h * 0.2, w * 0.05);
  ctx.fill();
  roundRect(ctx, 0, h * 0.66, w * 0.1, h * 0.2, w * 0.05);
  ctx.fill();
  roundRect(ctx, w * 0.9, h * 0.66, w * 0.1, h * 0.2, w * 0.05);
  ctx.fill();

  // lights
  if (opts.headlights) {
    ctx.shadowColor = "#fff8d0";
    ctx.shadowBlur = w * 0.7;
    ctx.fillStyle = "#fff8d0";
    ctx.fillRect(w * 0.17, -h * 0.01, w * 0.16, h * 0.035);
    ctx.fillRect(w * 0.67, -h * 0.01, w * 0.16, h * 0.035);
  } else {
    ctx.shadowColor = "#ff4d4d";
    ctx.shadowBlur = w * 0.45;
    ctx.fillStyle = "#ff5555";
    ctx.fillRect(w * 0.17, h * 0.96, w * 0.16, h * 0.035);
    ctx.fillRect(w * 0.67, h * 0.96, w * 0.16, h * 0.035);
  }
  ctx.restore();
}

export function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const scale = Math.abs(Math.cos(p.spin)) * 0.6 + 0.4;
  const color = p.kind === "coin" ? "#ffd400" : p.kind === "boost" ? "#00ff9d" : "#00e5ff";
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, 1);
  ctx.shadowColor = color;
  ctx.shadowBlur = p.w;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(6,10,18,0.85)";
  ctx.font = `bold ${Math.round(p.w * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(p.kind === "coin" ? "$" : p.kind === "boost" ? "»" : "~", 0, p.w * 0.03);
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const t = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = p.kind === "smoke" ? t * 0.35 : t;
    ctx.fillStyle = p.color;
    if (p.kind === "spark") {
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.kind === "smoke" ? 2 - t : t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, intensity: number) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.5, intensity);
  ctx.strokeStyle = "#bff7ff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    const x = ((i * 97.3 + t * 40) % w);
    const y = ((i * 211.7 + t * 900) % (h + 200)) - 100;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 70 * intensity + 30);
    ctx.stroke();
  }
  ctx.restore();
}

function shade(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `rgb(${r},${g},${b})`;
}
