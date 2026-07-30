import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const runSchema = z.object({
  score: z.number().int().min(0).max(100000),
  coins: z.number().int().min(0).max(10000),
  durationMs: z.number().int().min(0).max(6 * 60 * 60 * 1000),
  carSlug: z.string().min(1).max(60),
  nearMisses: z.number().int().min(0).max(100000).default(0),
  bestCombo: z.number().int().min(0).max(10000).default(0),
  distanceM: z.number().int().min(0).max(10000000).default(0),
  policeEscapes: z.number().int().min(0).max(1000).default(0),
});

/**
 * Records a finished run. The score is validated against the run duration on the
 * server, and profile stats / car unlocks are written with service credentials so
 * clients can never write their own high score.
 */
export const submitRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => runSchema.parse(data))
  .handler(async ({ data, context }) => {
    const seconds = data.durationMs / 1000;
    // Near-miss bonuses (up to 1000/s) and pursuit bonuses widen the ceiling.
    const plausibleMax = 300 + seconds * 900;
    if (data.score > plausibleMax || data.coins > 4 + seconds * 2) {
      throw new Error("Run rejected: score is not consistent with the run duration.");
    }

    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("high_score, games_played, total_coins, total_score")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile) throw new Error("Profile not found");

    await supabaseAdmin.from("game_runs").insert({
      user_id: userId,
      score: data.score,
      coins: data.coins,
      duration_ms: data.durationMs,
      car_slug: data.carSlug,
      near_misses: data.nearMisses,
      best_combo: data.bestCombo,
      distance_m: data.distanceM,
      police_escapes: data.policeEscapes,
    });

    const isNewBest = data.score > profile.high_score;
    const next = {
      high_score: Math.max(profile.high_score, data.score),
      games_played: profile.games_played + 1,
      total_coins: profile.total_coins + data.coins,
      total_score: Number(profile.total_score) + data.score,
    };
    const { error: updateError } = await supabaseAdmin.from("profiles").update(next).eq("id", userId);
    if (updateError) throw updateError;

    // Grant any newly earned cars.
    const [{ data: cars }, { data: owned }] = await Promise.all([
      supabaseAdmin.from("cars").select("id, slug, name, unlock_type, unlock_value"),
      supabaseAdmin.from("unlocked_cars").select("car_id").eq("user_id", userId),
    ]);
    const ownedIds = new Set((owned ?? []).map((o) => o.car_id));
    const earned = (cars ?? []).filter((car) => {
      if (ownedIds.has(car.id)) return false;
      if (car.unlock_type === "starter") return true;
      if (car.unlock_type === "high_score") return next.high_score >= car.unlock_value;
      if (car.unlock_type === "games_played") return next.games_played >= car.unlock_value;
      if (car.unlock_type === "total_coins") return next.total_coins >= car.unlock_value;
      return false;
    });
    if (earned.length) {
      await supabaseAdmin
        .from("unlocked_cars")
        .insert(earned.map((c) => ({ user_id: userId, car_id: c.id })));
    }

    const { data: rank } = await supabaseAdmin.rpc("get_player_rank", { _user_id: userId });

    return {
      isNewBest,
      highScore: next.high_score,
      gamesPlayed: next.games_played,
      totalCoins: next.total_coins,
      rank: (rank as number | null) ?? null,
      newlyUnlocked: earned.map((c) => c.name),
    };
  });
