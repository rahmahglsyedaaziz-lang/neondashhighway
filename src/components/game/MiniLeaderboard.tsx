import { useQuery } from "@tanstack/react-query";
import { Crown, Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/lib/account";

/** Top racers, shown on the crash screen so players see where they stand. */
export function MiniLeaderboard() {
  const { user } = useSessionUser();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", "top5"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("id, username, high_score")
        .order("high_score", { ascending: false })
        .order("games_played", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 15_000,
  });

  return (
    <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-3 text-left">
      <div className="flex items-center justify-between">
        <span className="hud-label flex items-center gap-1">
          <Trophy className="size-3.5" /> Global top 5
        </span>
        <Link to="/leaderboard" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>

      {isLoading && <p className="mt-2 text-xs text-muted-foreground">Loading standings…</p>}

      <ol className="mt-2 space-y-1">
        {data?.map((row, i) => (
          <li
            key={row.id}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
              row.id === user?.id ? "bg-primary/15 text-primary" : ""
            }`}
          >
            <span className="w-5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            {i === 0 && <Crown className="size-3.5 shrink-0 text-accent" />}
            <span className="flex-1 truncate font-semibold">{row.username}</span>
            <span className="tabular-nums">{row.high_score}</span>
          </li>
        ))}
      </ol>

      {data?.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No scores recorded yet.</p>
      )}

      {!user && (
        <p className="mt-2 text-xs text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          to get on the board.
        </p>
      )}
    </div>
  );
}
