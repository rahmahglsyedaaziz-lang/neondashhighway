import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Levels the player has already completed, with their best score per level. */
export const getCareerProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("career_progress")
      .select("level, best_score")
      .eq("user_id", context.userId);
    if (error) throw error;
    return (data ?? []) as Array<{ level: number; best_score: number }>;
  });

/**
 * Records a finished career level and grants the career car reward for it.
 * Career unlocks are level-based only — coins and high scores are untouched.
 */
export const completeCareerLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ level: z.number().int().min(1).max(35), score: z.number().int().min(0).max(1000000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CAREER_REWARD_LEVELS } = await import("@/game/career");

    const { data: existing } = await supabaseAdmin
      .from("career_progress")
      .select("level, best_score")
      .eq("user_id", userId);
    const completed = (existing ?? []).map((r) => r.level);
    const highest = completed.length ? Math.max(...completed) : 0;
    if (data.level > highest + 1) throw new Error("That career level is still locked.");

    const prev = (existing ?? []).find((r) => r.level === data.level);
    await supabaseAdmin.from("career_progress").upsert(
      {
        user_id: userId,
        level: data.level,
        best_score: Math.max(prev?.best_score ?? 0, data.score),
      },
      { onConflict: "user_id,level" },
    );

    // Career rewards map to the existing garage catalogue, in catalogue order.
    const rewardIndex = CAREER_REWARD_LEVELS.indexOf(data.level);
    const newlyUnlocked: string[] = [];
    if (rewardIndex >= 0) {
      const { data: cars } = await supabaseAdmin
        .from("cars")
        .select("id, name, slug, unlock_type, sort_order")
        .order("sort_order");
      const rewardable = (cars ?? []).filter((c) => c.unlock_type !== "starter");
      const car = rewardable[rewardIndex % Math.max(1, rewardable.length)];
      if (car) {
        const { data: owned } = await supabaseAdmin
          .from("unlocked_cars")
          .select("car_id")
          .eq("user_id", userId)
          .eq("car_id", car.id)
          .maybeSingle();
        if (!owned) {
          await supabaseAdmin.from("unlocked_cars").insert({ user_id: userId, car_id: car.id });
          newlyUnlocked.push(car.name);
        }
      }
    }

    return { level: data.level, nextLevel: Math.min(35, data.level + 1), newlyUnlocked };
  });
