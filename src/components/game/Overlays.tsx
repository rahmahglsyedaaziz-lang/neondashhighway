import { useState } from "react";
import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { DailyRewardCard } from "@/components/game/DailyRewardCard";
import type { RoadMode } from "@/game/GameEngine";
import type { HudState } from "@/game/types";

const MODES: Array<{ id: RoadMode; icon: string; title: string; tagline: string }> = [
  { id: "single", icon: "🏎️", title: "SINGLE LANE", tagline: "One lane. No mistakes." },
  { id: "double", icon: "🏎️🏎️", title: "DOUBLE LANE", tagline: "Two lanes. More room to dodge." },
];

function RoadModeDialog({
  onPick,
  onClose,
}: {
  onPick: (mode: RoadMode) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="animate-fade-in absolute inset-0 z-40 flex items-center justify-center bg-background/85 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your road"
      onClick={onClose}
    >
      <div className="panel w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-glow-primary text-2xl font-black tracking-tight">CHOOSE YOUR ROAD</h2>
        <div className="mt-4 grid gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m.id)}
              className="rounded-xl border border-border bg-muted/20 p-3 text-left transition hover:border-primary hover:bg-primary/10"
            >
              <span className="text-lg">{m.icon}</span>
              <span className="mt-1 block text-sm font-black tracking-tight">{m.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{m.tagline}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StartMenu({ hud, onStart }: { hud: HudState; onStart: (mode: RoadMode) => void }) {
  const [picking, setPicking] = useState(false);
  if (hud.phase !== "menu") return null;
  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-4 backdrop-blur-md">
      {picking && <RoadModeDialog onPick={onStart} onClose={() => setPicking(false)} />}
      <div className="panel w-full max-w-md text-center">
        <p className="hud-label">Endless arcade racer</p>
        <h1 className="text-glow-primary mt-2 text-4xl font-black tracking-tight sm:text-5xl">
          TRAFFIC DODGE
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Weave through neon traffic, graze cars for combo points and grab boosts. One crash ends the run.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="stat-tile">
            <span className="hud-label">Best</span>
            <span className="text-glow-accent text-2xl font-black tabular-nums">{hud.highScore}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Today</span>
            <span className="text-2xl font-black tabular-nums">{hud.dailyBest}</span>
          </div>
        </div>
        <DailyRewardCard />

        <button className="btn-neon mt-6 w-full" onClick={() => setPicking(true)}>
          <Play className="size-4" /> PLAY GAME
        </button>
        <div className="mt-3 flex gap-2">
          <Link to="/leaderboard" className="btn-ghost flex-1 !py-2 !text-xs">
            Leaderboard
          </Link>
          <Link to="/garage" className="btn-ghost flex-1 !py-2 !text-xs">
            Garage
          </Link>
          <Link to="/auth" className="btn-ghost flex-1 !py-2 !text-xs">
            Account
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Arrow keys / A · D to steer — swipe or tap on mobile — Space to pause
        </p>
      </div>
    </div>
  );
}

export function PauseOverlay({ hud, onResume }: { hud: HudState; onResume: () => void }) {
  if (hud.phase !== "paused") return null;
  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-background/75 px-4 backdrop-blur-md">
      <div className="panel w-full max-w-xs text-center">
        <h2 className="text-glow-primary text-2xl font-black">PAUSED</h2>
        <p className="mt-2 text-sm text-muted-foreground">Score {hud.score} · Level {hud.level}</p>
        <button className="btn-neon mt-5 w-full" onClick={onResume}>
          <Play className="size-4" /> Resume
        </button>
      </div>
    </div>
  );
}

export function Countdown({ hud }: { hud: HudState }) {
  if (hud.phase !== "countdown") return null;
  const label = hud.countdown > 0 ? String(hud.countdown) : "GO";
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <span key={label} className="animate-pop text-glow-primary text-7xl font-black sm:text-8xl">
        {label}
      </span>
    </div>
  );
}
