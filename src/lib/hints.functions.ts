import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Buys the next career hint for the current level, paying with garage coins. */
export const buyCareerHint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ level: z.number().int().min(1).max(35), index: z.number().int().min(0).max(20) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getCareerHints, HINT_COST } = await import("@/game/hints");

    const set = getCareerHints(data.level);
    const hint = set.hints[data.index % set.hints.length];

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("total_coins")
      .eq("id", context.userId)
      .maybeSingle();

    const coins = profile?.total_coins ?? 0;
    if (coins < HINT_COST) {
      return { purchased: false as const, coins, hint: null, objective: set.objective };
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ total_coins: coins - HINT_COST })
      .eq("id", context.userId);
    if (error) throw error;

    return { purchased: true as const, coins: coins - HINT_COST, hint, objective: set.objective };
  });
