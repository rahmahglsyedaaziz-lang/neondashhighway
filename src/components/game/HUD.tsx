import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { HudState } from "@/game/types";

interface Props {
  hud: HudState;
  onPause: () => void;
  onToggleSound: () => void;
}

export function HUD({ hud, onPause, onToggleSound }: Props) {
  const playing = hud.phase === "playing" || hud.phase === "paused" || hud.phase === "countdown";
  if (!playing) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5">
      <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
        <div className="hud-panel">
          <span className="hud-label">Score</span>
          <span className="hud-value text-glow-primary tabular-nums">{hud.score}</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="hud-panel items-center">
            <span className="hud-label">Level {hud.level}</span>
            <span className="hud-sub uppercase tracking-[0.2em]">{hud.timeOfDay}</span>
          </div>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
            {hud.mapName}
          </span>
          {hud.combo > 0 && (
            <div
              key={hud.combo}
              className="animate-pop rounded-full border border-accent/60 bg-accent/15 px-3 py-1 text-xs font-bold text-accent"
            >
              NEAR MISS x{hud.combo}
            </div>
          )}
          {hud.policeActive && (
            <div className="animate-pop rounded-full border border-destructive/70 bg-destructive/20 px-3 py-1 text-xs font-black tracking-wider text-destructive">
              🚨 PURSUIT — FIND THE EXIT ({hud.policeRemaining}s)
            </div>
          )}
          {hud.exitAvailable && (
            <div className="animate-pop rounded-full border border-accent/70 bg-accent/15 px-3 py-1 text-xs font-black tracking-wider text-accent">
              {hud.exitSide === "left" ? "◀ EXIT LEFT" : "EXIT RIGHT ▶"}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="hud-panel items-end">
            <span className="hud-label">Best</span>
            <span className="hud-value text-glow-accent tabular-nums">{hud.highScore}</span>
          </div>
          <div className="pointer-events-auto flex flex-col gap-2">
            <button aria-label="Pause game" className="icon-btn" onClick={onPause}>
              {hud.phase === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <button aria-label="Toggle sound" className="icon-btn" onClick={onToggleSound}>
              {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-2 flex max-w-3xl justify-center gap-2">
        {hud.boostMs > 0 && <span className="pill pill-boost">SPEED BOOST</span>}
        {hud.slowMs > 0 && <span className="pill pill-slow">SLOW MOTION</span>}
        {hud.coins > 0 && <span className="pill pill-coin">{hud.coins} coins</span>}
      </div>

      {hud.nearMissEvent && (
        <div
          key={hud.nearMissEvent.id}
          className="animate-near-miss pointer-events-none absolute inset-x-0 top-1/3 text-center"
          style={{ opacity: 0.75 + hud.nearMissEvent.intensity * 0.25 }}
        >
          <span className="text-glow-accent text-2xl font-black tracking-tight sm:text-4xl">
            🔥 NEAR MISS! +{hud.nearMissEvent.points}
          </span>
          {hud.nearMissEvent.combo > 1 && (
            <p className="mt-1 text-sm font-bold text-accent">{hud.nearMissEvent.combo}X COMBO</p>
          )}
        </div>
      )}

      {hud.pursuitStartFlash && !hud.policeEscapedFlash && (
        <div className="animate-pop pointer-events-none absolute inset-x-0 top-1/4 text-center">
          <span className="text-2xl font-black text-destructive sm:text-3xl">🚨 POLICE PURSUIT STARTED!</span>
        </div>
      )}

      {hud.policeEscapedFlash && (
        <div className="animate-pop pointer-events-none absolute inset-x-0 top-1/4 text-center">
          <span className="text-glow-accent text-2xl font-black sm:text-3xl">🚨 ESCAPED!</span>
        </div>
      )}

      {hud.lastAchievement && (
        <div className="animate-fade-up mx-auto mt-3 w-fit rounded-xl border border-primary/50 bg-card/85 px-4 py-2 text-sm font-semibold text-primary backdrop-blur">
          Achievement unlocked — {hud.lastAchievement}
        </div>
      )}
    </div>
  );
}
