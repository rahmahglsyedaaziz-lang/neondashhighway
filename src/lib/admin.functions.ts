import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "owner" | "admin" | "player";

async function loadRoles(supabase: {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => Promise<{ data: { role: string }[] | null }> };
  };
}, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r) => r.role as Role);
}

/** Aggregated stats for the admin / owner dashboard. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!roles.includes("admin") && !roles.includes("owner")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [players, runs, runs24h, topRun, coins] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("game_runs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("game_runs").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("game_runs").select("score").order("score", { ascending: false }).limit(1),
      supabaseAdmin.from("profiles").select("total_coins"),
    ]);

    return {
      totalPlayers: players.count ?? 0,
      totalRuns: runs.count ?? 0,
      runsLast24h: runs24h.count ?? 0,
      topScore: topRun.data?.[0]?.score ?? 0,
      totalCoins: (coins.data ?? []).reduce((sum, r) => sum + (r.total_coins ?? 0), 0),
      isOwner: roles.includes("owner"),
    };
  });

/** Owner-only: promote or demote a player. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["owner", "admin", "player"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!roles.includes("owner")) throw new Error("Only the owner can change roles.");
    if (data.userId === context.userId) throw new Error("You cannot change your own role.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw error;
    return { ok: true };
  });

/** Admin/owner: wipe a player's scores after cheating reports. */
export const resetPlayerScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const roles = await loadRoles(context.supabase as never, context.userId);
    if (!roles.includes("admin") && !roles.includes("owner")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const targetRoles = await loadRoles(supabaseAdmin as never, data.userId);
    if (targetRoles.includes("owner")) throw new Error("The owner's scores cannot be reset.");

    await supabaseAdmin.from("game_runs").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ high_score: 0, games_played: 0, total_coins: 0, total_score: 0 })
      .eq("id", data.userId);
    if (error) throw error;
    return { ok: true };
  });
