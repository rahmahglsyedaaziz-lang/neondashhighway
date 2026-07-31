import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2 } from "lucide-react";

import { useSessionUser } from "@/lib/account";
import { claimDailyReward, getDailyReward } from "@/lib/rewards.functions";

/** Daily login reward card — only rendered for signed-in players. */
export function DailyRewardCard() {
  const { user } = useSessionUser();
  const fetchReward = useServerFn(getDailyReward);
  const claim = useServerFn(claimDailyReward);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["daily-reward", user?.id],
    enabled: !!user,
    queryFn: () => fetchReward(),
  });

  const mutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reward", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  if (!user) return null;

  const claimed = data?.claimedToday || mutation.data?.claimed || mutation.data?.alreadyClaimed;
  const streak = mutation.data?.streak ?? data?.streak ?? 1;
  const coins = mutation.data?.coins ?? data?.coins ?? 0;

  return (
    <div className="stat-tile mt-4 flex items-center justify-between gap-3 text-left">
      <div>
        <span className="hud-label flex items-center gap-1">
          <Gift className="size-3" /> Daily reward
        </span>
        <span className="text-sm font-bold tabular-nums">
          {claimed ? `Claimed · +${coins} coins` : `+${coins} coins`}
          <span className="ml-2 text-xs font-medium text-muted-foreground">Day {streak} streak</span>
        </span>
      </div>
      <button
        className="btn-neon !px-3 !py-2 !text-xs"
        disabled={isLoading || claimed || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : claimed ? "Done" : "Claim"}
      </button>
    </div>
  );
}
