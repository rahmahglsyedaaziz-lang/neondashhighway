import { Link } from "@tanstack/react-router";
import { Gauge, LogOut, Trophy, Warehouse, Shield, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSessionUser } from "@/lib/account";

export function NavBar() {
  const { user } = useSessionUser();
  const { data: profile } = useProfile(user?.id);
  const { data: roles } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const isStaff = !!roles?.some((r) => r === "admin" || r === "owner");

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="text-glow-primary mr-auto text-lg font-black tracking-tight">
          TRAFFIC DODGE
        </Link>
        <Link to="/leaderboard" className="btn-ghost !py-2 !text-xs">
          <Trophy className="size-4" /> Leaderboard
        </Link>
        {user ? (
          <>
            <Link to="/garage" className="btn-ghost !py-2 !text-xs">
              <Warehouse className="size-4" /> Garage
            </Link>
            {isStaff && (
              <Link to="/dashboard" className="btn-ghost !py-2 !text-xs">
                <Shield className="size-4" /> Dashboard
              </Link>
            )}
            <span className="hidden items-center gap-1 text-xs font-semibold text-muted-foreground sm:flex">
              <Gauge className="size-3.5" /> {profile?.username ?? "racer"} · {profile?.high_score ?? 0}
            </span>
            <button className="icon-btn" aria-label="Sign out" onClick={signOut}>
              <LogOut className="size-4" />
            </button>
          </>
        ) : (
          <Link to="/auth" className="btn-neon !py-2 !text-xs">
            <User className="size-4" /> Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
