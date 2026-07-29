import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Coins, Gauge, ShieldCheck, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/site/NavBar";
import { getDashboardStats, resetPlayerScores, setUserRole } from "@/lib/admin.functions";
import type { Role } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const staff = (roles ?? []).some((r) => r.role === "admin" || r.role === "owner");
    if (!staff) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Staff Dashboard — Traffic Dodge Admin" },
      {
        name: "description",
        content:
          "Private Traffic Dodge staff dashboard with player counts, run activity, top scores and moderation tools for admins and the owner.",
      },
      { property: "og:title", content: "Staff Dashboard — Traffic Dodge Admin" },
      { property: "og:description", content: "Player, run and moderation overview for Traffic Dodge staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="min-h-[100dvh] bg-background">
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-destructive">
        Dashboard unavailable: {(error as Error).message}
      </main>
    </div>
  ),
});

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="panel !p-4">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <p className="hud-label mt-2">{label}</p>
      <p className="text-2xl font-black tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

function DashboardPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const changeRole = useServerFn(setUserRole);
  const resetScores = useServerFn(resetPlayerScores);
  const queryClient = useQueryClient();

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });

  const players = useQuery({
    queryKey: ["admin-players"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, high_score, games_played, total_coins, created_at")
          .order("high_score", { ascending: false })
          .limit(200),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (error) throw error;
      const roleMap = new Map<string, Role>();
      (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role as Role));
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "player" }));
    },
  });

  const recentRuns = useQuery({
    queryKey: ["admin-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_runs")
        .select("id, score, coins, car_slug, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: Role }) => changeRole({ data: vars }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-players"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetScores({ data: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const isOwner = !!stats.data?.isOwner;
  const nameOf = (id: string) => players.data?.find((p) => p.id === id)?.username ?? "unknown";

  return (
    <div className="min-h-[100dvh] bg-background">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-glow-primary flex items-center gap-2 text-3xl font-black tracking-tight">
          <ShieldCheck className="size-7" /> {isOwner ? "Owner" : "Admin"} dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Live overview of the Traffic Dodge community. Only admins and the owner can open this page.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard icon={<Users className="size-5" />} label="Players" value={stats.data?.totalPlayers ?? 0} />
          <StatCard icon={<Activity className="size-5" />} label="Total runs" value={stats.data?.totalRuns ?? 0} />
          <StatCard icon={<Activity className="size-5" />} label="Runs 24h" value={stats.data?.runsLast24h ?? 0} />
          <StatCard icon={<Gauge className="size-5" />} label="Top score" value={stats.data?.topScore ?? 0} />
          <StatCard icon={<Coins className="size-5" />} label="Coins" value={stats.data?.totalCoins ?? 0} />
        </div>

        <h2 className="mt-10 text-xl font-black">Players</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-3 py-2">Racer</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2 text-right">Best</th>
                <th className="px-3 py-2 text-right">Runs</th>
                <th className="px-3 py-2 text-right">Coins</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.data?.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">{p.username}</td>
                  <td className="px-3 py-2">
                    {isOwner ? (
                      <select
                        className="rounded-md border border-border bg-secondary/60 px-2 py-1 text-xs"
                        value={p.role}
                        onChange={(e) =>
                          roleMutation.mutate({ userId: p.id, role: e.target.value as Role })
                        }
                      >
                        <option value="player">player</option>
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                      </select>
                    ) : (
                      <span className="badge badge-off">{p.role}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.high_score}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.games_played}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.total_coins}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="icon-btn"
                      aria-label={`Reset scores for ${p.username}`}
                      onClick={() => resetMutation.mutate(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(roleMutation.isError || resetMutation.isError) && (
          <p className="mt-3 text-sm text-destructive">
            {((roleMutation.error ?? resetMutation.error) as Error)?.message}
          </p>
        )}

        <h2 className="mt-10 text-xl font-black">Recent runs</h2>
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {recentRuns.data?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-semibold">{nameOf(r.user_id)}</span>
              <span className="text-muted-foreground">{r.car_slug}</span>
              <span className="tabular-nums">
                {r.score} pts · {r.coins} coins
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </li>
          ))}
          {recentRuns.data?.length === 0 && (
            <li className="px-3 py-4 text-sm text-muted-foreground">No runs recorded yet.</li>
          )}
        </ul>
      </main>
    </div>
  );
}
