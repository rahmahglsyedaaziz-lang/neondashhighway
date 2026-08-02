import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Trophy } from "lucide-react";

import {
  CAREER_LEVELS,
  CAREER_LEVEL_COUNT,
  getLocalCareer,
  highestUnlocked,
} from "@/game/career";
import { getCareerProgress } from "@/lib/career.functions";
import { useSessionUser } from "@/lib/account";
import { CareerHint } from "@/components/game/CareerHint";

/** Career level grid — 35 levels, unlocked one at a time, replayable. */
export function CareerScreen({ onPlay }: { onPlay: (level: number) => void }) {
  const { user } = useSessionUser();
  const fetchProgress = useServerFn(getCareerProgress);

  const { data: remote } = useQuery({
    queryKey: ["career", user?.id],
    enabled: !!user,
    queryFn: () => fetchProgress(),
  });

  const completed = Array.from(
    new Set([...(remote ?? []).map((r) => r.level), ...getLocalCareer()]),
  );
  const unlockedTo = highestUnlocked(completed);

  return (
    <div>
      <p className="hud-label mt-1">{CAREER_LEVEL_COUNT} LEVELS</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-black text-accent">
        <Trophy className="size-4" /> Level {completed.length} / {CAREER_LEVEL_COUNT} Completed
      </p>
      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-secondary">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: `${(completed.length / CAREER_LEVEL_COUNT) * 100}%` }}
        />
      </span>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {CAREER_LEVELS.map((lvl) => {
          const done = completed.includes(lvl.level);
          const locked = lvl.level > unlockedTo;
          return (
            <button
              key={lvl.level}
              type="button"
              disabled={locked}
              onClick={() => onPlay(lvl.level)}
              title={`${lvl.targetM} m · ${lvl.traffic === "twoway" ? "two-way" : "one-way"} traffic${
                lvl.reward ? " · car reward" : ""
              }`}
              className={`relative rounded-lg border p-2 text-xs font-black tabular-nums transition ${
                locked
                  ? "cursor-not-allowed border-border bg-muted/10 text-muted-foreground opacity-60"
                  : done
                    ? "border-accent bg-accent/10 text-accent hover:bg-accent/20"
                    : "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {locked ? <Lock className="mx-auto size-3.5" /> : lvl.level}
              {lvl.reward && !locked && <span className="absolute right-1 top-0.5 text-[9px]">🚗</span>}
            </button>
          );
        })}
      </div>

      <CareerHint level={unlockedTo} />

      <p className="mt-3 text-xs text-muted-foreground">
        Clear a level to unlock the next one. Levels 5, 10, 15, 20, 25, 30 and 35 unlock a car in your
        garage. Completed levels can be replayed any time.
      </p>
    </div>
  );
}
