import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { DailyRewardCard } from "@/components/game/DailyRewardCard";
import type { HudState } from "@/game/types";


export function StartMenu({ hud, onStart }: { hud: HudState; onStart: () => void }) {
  if (hud.phase !== "menu") return null;
  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-background/70 px-4 backdrop-blur-md">
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
        <button className="btn-neon mt-6 w-full" onClick={onStart}>
          <Play className="size-4" /> Start engine

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
