import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dayBefore(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Coins for a given streak day (capped at a 7 day cycle). */
export function rewardForStreak(streak: number) {
  return 50 + 25 * (Math.min(streak, 7) - 1);
}

/** Whether today's login reward is still available, plus the current streak. */
export const getDailyReward = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = todayUtc();

    const { data: last } = await supabaseAdmin
      .from("daily_logins")
      .select("claim_date, streak, coins_awarded")
      .eq("user_id", context.userId)
      .order("claim_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const claimedToday = last?.claim_date === today;
    const streak = claimedToday
      ? last!.streak
      : last?.claim_date === dayBefore(today)
        ? last.streak + 1
        : 1;

    return {
      claimedToday,
      streak,
      coins: claimedToday ? (last?.coins_awarded ?? 0) : rewardForStreak(streak),
    };
  });

/** Claims today's login reward once per UTC day and credits the coins. */
export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = todayUtc();
    const userId = context.userId;

    const { data: last } = await supabaseAdmin
      .from("daily_logins")
      .select("claim_date, streak, coins_awarded")
      .eq("user_id", userId)
      .order("claim_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last?.claim_date === today) {
      return { claimed: false, alreadyClaimed: true, streak: last.streak, coins: last.coins_awarded };
    }

    const streak = last?.claim_date === dayBefore(today) ? last.streak + 1 : 1;
    const coins = rewardForStreak(streak);

    const { error: insertError } = await supabaseAdmin
      .from("daily_logins")
      .insert({ user_id: userId, claim_date: today, streak, coins_awarded: coins });
    if (insertError) {
      // Unique violation = a parallel claim already landed for today.
      return { claimed: false, alreadyClaimed: true, streak, coins };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("total_coins")
      .eq("id", userId)
      .maybeSingle();

    const totalCoins = (profile?.total_coins ?? 0) + coins;
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ total_coins: totalCoins })
      .eq("id", userId);
    if (updateError) throw updateError;

    return { claimed: true, alreadyClaimed: false, streak, coins, totalCoins };
  });
