import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Car = {
  id: string;
  slug: string;
  name: string;
  rarity: string;
  color: string;
  accent: string;
  style: number;
  speed: number;
  handling: number;
  acceleration: number;
  braking: number;
  unlock_type: string;
  unlock_value: number;
  description: string;
  sort_order: number;
};

export type Profile = {
  id: string;
  username: string;
  high_score: number;
  games_played: number;
  total_coins: number;
  total_score: number;
  selected_car_slug: string;
  created_at: string;
};

export const DEFAULT_CAR_SLUG = "cyan-cruiser";
const LOCAL_CAR_KEY = "traffic-dodge:car";

export function getLocalCarSlug() {
  if (typeof window === "undefined") return DEFAULT_CAR_SLUG;
  return window.localStorage.getItem(LOCAL_CAR_KEY) ?? DEFAULT_CAR_SLUG;
}

export function setLocalCarSlug(slug: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_CAR_KEY, slug);
}

/** Current auth user, kept in sync with Supabase auth events. */
export function useSessionUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

export function useCars() {
  return useQuery({
    queryKey: ["cars"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cars").select("*").order("sort_order");
      if (error) throw error;
      return data as Car[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUnlockedSlugs(userId: string | undefined) {
  return useQuery({
    queryKey: ["unlocks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unlocked_cars")
        .select("car_id, cars(slug)")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => (r.cars as { slug: string } | null)?.slug).filter(Boolean) as string[];
    },
  });
}

export type Role = "owner" | "admin" | "player";

export function useRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["roles", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as Role);
    },
  });
}

export function rarityClass(rarity: string) {
  switch (rarity) {
    case "legendary":
      return "text-glow-accent";
    case "epic":
      return "text-primary";
    case "rare":
      return "text-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function unlockLabel(car: Car) {
  switch (car.unlock_type) {
    case "high_score":
      return `High score ${car.unlock_value}`;
    case "games_played":
      return `${car.unlock_value} runs played`;
    case "total_coins":
      return `${car.unlock_value} coins collected`;
    default:
      return "Starter car";
  }
}

export function unlockProgress(car: Car, profile: Profile | null | undefined) {
  if (!profile || car.unlock_type === "starter") return 1;
  const current =
    car.unlock_type === "high_score"
      ? profile.high_score
      : car.unlock_type === "games_played"
        ? profile.games_played
        : profile.total_coins;
  return Math.max(0, Math.min(1, current / Math.max(1, car.unlock_value)));
}
