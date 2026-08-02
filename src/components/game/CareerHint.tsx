import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Loader2 } from "lucide-react";

import { HINT_COST, getCareerHints } from "@/game/hints";
import { buyCareerHint } from "@/lib/hints.functions";
import { useProfile, useSessionUser } from "@/lib/account";

/**
 * Career hint button. Signed-in players spend coins for a hint tied to the
 * current level's objective; guests get the same coaching for free.
 */
export function CareerHint({ level }: { level: number }) {
  const { user } = useSessionUser();
  const { data: profile } = useProfile(user?.id);
  const buy = useServerFn(buyCareerHint);
  const queryClient = useQueryClient();

  const set = getCareerHints(level);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coins = profile?.total_coins ?? 0;
  const allShown = revealed.length >= set.hints.length;
  const tooPoor = !!user && coins < HINT_COST;

  const reveal = async () => {
    setError(null);
    if (allShown) return;
    if (!user) {
      setRevealed((r) => [...r, set.hints[r.length]]);
      return;
    }
    setBusy(true);
    try {
      const res = await buy({ data: { level, index: revealed.length } });
      if (!res.purchased || !res.hint) {
        setError(`You need ${HINT_COST} coins for a hint.`);
      } else {
        setRevealed((r) => [...r, res.hint!]);
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    } catch {
      setError("Could not buy a hint right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-3 text-left">
      <p className="hud-label">Level {level} objective</p>
      <p className="mt-1 text-xs font-semibold text-foreground">{set.objective}</p>

      {revealed.map((h, i) => (
        <p key={i} className="animate-fade-up mt-2 text-xs leading-relaxed text-accent">
          {h}
        </p>
      ))}

      {error && <p className="mt-2 text-xs font-semibold text-destructive">{error}</p>}

      <button
        type="button"
        className="btn-ghost mt-3 w-full !py-2 !text-xs"
        onClick={reveal}
        disabled={busy || allShown || tooPoor}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
        {allShown
          ? "No more hints for this level"
          : user
            ? `Get a hint — ${HINT_COST} coins (you have ${coins})`
            : "Get a free hint"}
      </button>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Hints coach you through the level — you still have to drive it yourself.
      </p>
    </div>
  );
}
