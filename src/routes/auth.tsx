import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSessionUser } from "@/lib/account";
import { NavBar } from "@/components/site/NavBar";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: { next?: unknown }): { next: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") ? s.next : "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Traffic Dodge Racer Account" },
      {
        name: "description",
        content:
          "Create a free Traffic Dodge account to save your high scores, climb the global leaderboard and unlock new cars in the garage.",
      },
      { property: "og:title", content: "Sign in — Traffic Dodge Racer Account" },
      {
        property: "og:description",
        content: "Save your high scores, join the global leaderboard and unlock neon cars.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useSessionUser();
  const { next } = useSearch({ from: "/auth" });
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: next, replace: true });
  }, [user, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + next,
            data: { username: username.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: next, replace: true });
        } else {
          setNotice("Account created. Check your inbox to confirm, then sign in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        /pwned|weak/i.test(message)
          ? "That password is too common. Pick a longer, more unique password."
          : message,
      );
    } finally {

      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setError("Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: next, replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <NavBar />
      <main className="mx-auto flex max-w-md flex-col px-4 py-10">
        <h1 className="text-glow-primary text-3xl font-black tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your racer"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account saves high scores, unlocks and your garage across devices.
        </p>

        <form className="panel mt-6 flex flex-col gap-3" onSubmit={submit}>
          {mode === "signup" && (
            <label className="flex flex-col gap-1">
              <span className="hud-label">Username</span>
              <input
                className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={18}
                required
                placeholder="NeonDrifter"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="hud-label">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="hud-label">Password</span>
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
          {notice && <p className="text-sm font-semibold text-primary">{notice}</p>}

          <button className="btn-neon mt-1" disabled={busy} type="submit">
            {mode === "signin" ? <LogIn className="size-4" /> : <UserPlus className="size-4" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" className="btn-ghost" onClick={google}>
            Continue with Google
          </button>
        </form>

        <button
          className="mt-4 text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "No account yet? Sign up" : "Already racing? Sign in"}
        </button>
      </main>
    </div>
  );
}
