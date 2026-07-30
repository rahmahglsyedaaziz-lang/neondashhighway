import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/site/NavBar";
import { useProfile, useSessionUser } from "@/lib/account";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Global Leaderboard — Traffic Dodge Top 100" },
      {
        name: "description",
        content:
          "See the top 100 Traffic Dodge racers ranked by high score. Track your rank, runs played and coins collected on the global neon highway leaderboard.",
      },
      { property: "og:title", content: "Global Leaderboard — Traffic Dodge Top 100" },
      {
        property: "og:description",
        content: "The 100 fastest Traffic Dodge racers, ranked by high score.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { user } = useSessionUser();
  const { data: profile } = useProfile(user?.id);

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("id, username, high_score, games_played, total_coins, selected_car_slug")
        .order("high_score", { ascending: false })
        .order("games_played", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const myRank = data?.findIndex((r) => r.id === user?.id);

  return (
    <div className="min-h-[100dvh] bg-background">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-glow-primary text-3xl font-black tracking-tight sm:text-4xl">
          Global leaderboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Top 100 racers by verified high score. Scores are recorded by the game server at the end of each run.
        </p>

        {user && profile && (
          <div className="panel mt-6 flex items-center justify-between gap-4 !py-4">
            <div>
              <span className="hud-label">Your standing</span>
              <p className="text-xl font-black">
                {myRank !== undefined && myRank >= 0 ? `#${myRank + 1}` : "Unranked"} · {profile.username}
              </p>
            </div>
            <div className="text-right">
              <span className="hud-label">Best</span>
              <p className="text-glow-accent text-2xl font-black tabular-nums">{profile.high_score}</p>
            </div>
          </div>
        )}

        {!user && (
          <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 !py-4">
            <p className="text-sm text-muted-foreground">Sign in to save your scores and appear here.</p>
            <Link to="/auth" className="btn-neon !py-2 !text-xs">
              Create account
            </Link>
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Racer</th>
                <th className="px-3 py-2 text-right font-semibold">Best</th>
                <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Runs</th>
                <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Coins</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                    Loading racers…
                  </td>
                </tr>
              )}
              {data?.map((row, i) => (
                <tr
                  key={row.id}
                  className={
                    row.id === user?.id
                      ? "border-t border-border bg-primary/10"
                      : "border-t border-border"
                  }
                >
                  <td className="px-3 py-2 font-bold tabular-nums">
                    {i === 0 ? (
                      <Crown className="size-4 text-accent" />
                    ) : i < 3 ? (
                      <Medal className="size-4 text-primary" />
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td className="px-3 py-2 font-semibold">{row.username}</td>
                  <td className="text-glow-primary px-3 py-2 text-right font-black tabular-nums">
                    {row.high_score}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                    {row.games_played}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                    {row.total_coins}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                    No scores yet — be the first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
