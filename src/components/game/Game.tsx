import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { GameEngine } from "@/game/GameEngine";
import type { HudState } from "@/game/types";
import { HUD } from "./HUD";
import { GameOverModal } from "./GameOverModal";
import { Countdown, PauseOverlay, StartMenu, type MenuStep } from "./Overlays";
import { submitRun } from "@/lib/game.functions";
import { completeCareerLevel } from "@/lib/career.functions";
import { addLocalCareer, getCareerLevel } from "@/game/career";
import {
  DEFAULT_CAR_SLUG,
  getLocalCarSlug,
  useCars,
  useProfile,
  useSessionUser,
} from "@/lib/account";


const INITIAL: HudState = {
  phase: "menu",
  score: 0,
  highScore: 0,
  dailyBest: 0,
  level: 1,
  combo: 0,
  coins: 0,
  countdown: 0,
  muted: false,
  boostMs: 0,
  slowMs: 0,
  timeOfDay: "day",
  unlocked: [],
  lastAchievement: null,
  nearMisses: 0,
  bestCombo: 0,
  nearMissEvent: null,
  distanceM: 0,
  policeActive: false,
  policeRemaining: 0,
  policeEscapedFlash: false,
  policeEscapes: 0,
  pursuitStartFlash: false,
  exitAvailable: false,
  exitSide: null,
  gameMode: "infinity",
  trafficMode: "oneway",
  careerLevel: 0,
  careerTargetM: 0,
  careerComplete: false,
  mapName: "NEON CITY HIGHWAY",
  mapTagline: "Downtown lights and dense traffic.",
  mapIndex: 0,
  mapTransition: false,
  mapFlash: false,
};

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudState>(INITIAL);
  const { user } = useSessionUser();
  const { data: cars } = useCars();
  const { data: profile } = useProfile(user?.id);
  const send = useServerFn(submitRun);
  const sendCareer = useServerFn(completeCareerLevel);
  const queryClient = useQueryClient();
  const carSlugRef = useRef(DEFAULT_CAR_SLUG);
  const signedInRef = useRef(false);
  signedInRef.current = !!user;

  // Apply the equipped car (account car when signed in, local pick for guests).
  useEffect(() => {
    const slug = profile?.selected_car_slug ?? getLocalCarSlug();
    carSlugRef.current = slug;
    const car = cars?.find((c) => c.slug === slug);
    if (car && engineRef.current) {
      engineRef.current.setCar({
        color: car.color,
        accent: car.accent,
        style: car.style,
        handling: car.handling,
        acceleration: car.acceleration,
      });
    }
  }, [cars, profile]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;
    engine.onHud = (s) => setHud({ ...s });
    engine.onRunEnd = (run) => {
      if (!signedInRef.current) return;
      void send({ data: { ...run, carSlug: carSlugRef.current } }).catch(() => {
        /* score sync failed — local best still shown */
      });
    };
    engine.onCareerComplete = (level, score) => {
      // Guests keep progress locally; signed-in players also earn car rewards.
      addLocalCareer(level);
      if (!signedInRef.current) return;
      void sendCareer({ data: { level, score } })
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ["career"] });
          void queryClient.invalidateQueries({ queryKey: ["unlocks"] });
        })
        .catch(() => {
          /* career sync failed — local progress still applies */
        });
    };



    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") {
        e.preventDefault();
        engine.move(-1);
      } else if (k === "arrowright" || k === "d") {
        e.preventDefault();
        engine.move(1);
      } else if (k === " " || k === "escape" || k === "p") {
        e.preventDefault();
        if (engine.phase === "menu" || engine.phase === "gameover") engine.start();
        else engine.togglePause();
      } else if (k === "m") {
        engine.toggleMute();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("keydown", onKey);
      engine.destroy();
    };
  }, []);

  // Touch: swipe or tap on a screen half.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const engine = engineRef.current;
    const start = touch.current;
    if (!engine || !start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
      engine.move(dx > 0 ? 1 : -1);
    } else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
      const half = (e.currentTarget as HTMLElement).clientWidth / 2;
      engine.move(t.clientX < half ? -1 : 1);
    }
    touch.current = null;
  };

  return (
    <div
      className="relative h-[100dvh] w-full touch-none overflow-hidden bg-background select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Traffic Dodge game canvas" />
      <HUD
        hud={hud}
        onPause={() => engineRef.current?.togglePause()}
        onToggleSound={() => engineRef.current?.toggleMute()}
      />
      <Countdown hud={hud} />
      <PauseOverlay hud={hud} onResume={() => engineRef.current?.togglePause()} />
      <StartMenu
        hud={hud}
        step={menuStep}
        setStep={setMenuStep}
        onStart={(req) => {
          const engine = engineRef.current;
          if (!engine) return;
          if (req.kind === "career") {
            const lvl = getCareerLevel(req.level);
            engine.setCareer(lvl.level, lvl.targetM, lvl.difficultyOffset, lvl.traffic);
          } else {
            engine.setInfinity(req.traffic);
          }
          engine.start();
        }}
      />
      <GameOverModal
        hud={hud}
        onRestart={() => engineRef.current?.start()}
        onBackToMenu={(step) => {
          setMenuStep(step);
          engineRef.current?.toMenu();
        }}
      />
    </div>
  );
}
