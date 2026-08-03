import { Share2, RotateCcw, Trophy, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { ACHIEVEMENTS } from "@/game/GameEngine";
import { MiniLeaderboard } from "@/components/game/MiniLeaderboard";
import { CareerHint } from "@/components/game/CareerHint";
import type { MenuStep } from "@/components/game/Overlays";
import type { HudState } from "@/game/types";

interface Props {
  hud: HudState;
  onRestart: () => void;
  onNextLevel?: () => void;
  onBackToMenu: (step: MenuStep) => void;
}

export function GameOverModal({ hud, onRestart, onNextLevel, onBackToMenu }: Props) {
  if (hud.phase !== "gameover") return null;
  const isRecord = hud.score > 0 && hud.score >= hud.highScore;
  const isCareer = hud.gameMode === "career";
  const canAdvance = isCareer && hud.careerComplete && hud.careerLevel < 35;

  const share = async () => {
    const text = `I scored ${hud.score} points in Traffic Dodge. Can you beat that?`;
    try {
      if (navigator.share) await navigator.share({ title: "Traffic Dodge", text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user dismissed share sheet */
    }
  };

  return (
    <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-background/80 px-4 backdrop-blur-md">
      <div className="animate-pop panel max-h-[92%] w-full max-w-sm overflow-y-auto text-center">
        {hud.careerComplete ? (
          <>
            <h2 className="text-glow-accent text-3xl font-black tracking-tight">LEVEL COMPLETE</h2>
            <p className="mt-1 text-sm font-semibold text-accent">
              Career Level {hud.careerLevel} cleared — next level unlocked
            </p>
          </>
        ) : (
          <h2 className="text-glow-destructive text-3xl font-black tracking-tight">CRASHED</h2>
        )}
        {isRecord && (
          <p className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-accent">
            <Trophy className="size-4" /> New personal best
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="stat-tile">
            <span className="hud-label">Final</span>
            <span className="text-glow-primary text-3xl font-black tabular-nums">{hud.score}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Best</span>
            <span className="text-glow-accent text-3xl font-black tabular-nums">{hud.highScore}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Today</span>
            <span className="text-xl font-bold tabular-nums">{hud.dailyBest}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Coins</span>
            <span className="text-xl font-bold tabular-nums">{hud.coins}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {ACHIEVEMENTS.map((a) => (
            <span
              key={a.id}
              title={a.description}
              className={
                hud.unlocked.includes(a.id)
                  ? "badge badge-on"
                  : "badge badge-off"
              }
            >
              {a.label}
            </span>
          ))}
        </div>

        {hud.careerLevel > 0 && !hud.careerComplete && <CareerHint level={hud.careerLevel} />}

        <MiniLeaderboard />


        <div className="mt-6 flex gap-3">
          {canAdvance && (
            <button className="btn-neon flex-1" onClick={onNextLevel}>
              <ChevronRight className="size-4" /> Next Level
            </button>
          )}
          <button className="btn-neon flex-1" onClick={onRestart}>
            <RotateCcw className="size-4" /> Play again
          </button>
          {!isCareer && (
            <button className="btn-ghost" onClick={share} aria-label="Share score">
              <Share2 className="size-4" /> Share
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-3">
          <button
            className="btn-ghost flex-1 !py-2 !text-xs"
            onClick={() => onBackToMenu(isCareer ? "career" : "traffic")}
          >
            <ChevronLeft className="size-4" /> {isCareer ? "Back to career" : "Back to infinity"}
          </button>
          <button className="btn-ghost flex-1 !py-2 !text-xs" onClick={() => onBackToMenu("mode")}>
            <Home className="size-4" /> Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
