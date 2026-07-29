import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/site/NavBar";
import {
  rarityClass,
  setLocalCarSlug,
  unlockLabel,
  unlockProgress,
  useCars,
  useProfile,
  useSessionUser,
  useUnlockedSlugs,
  type Car,
} from "@/lib/account";

export const Route = createFileRoute("/_authenticated/garage")({
  head: () => ({
    meta: [
      { title: "Garage — Unlock and Choose Your Traffic Dodge Car" },
      {
        name: "description",
        content:
          "Browse the Traffic Dodge garage, compare speed, handling, acceleration and braking, and equip the neon cars you unlock by scoring, racing and collecting coins.",
      },
      { property: "og:title", content: "Garage — Unlock and Choose Your Traffic Dodge Car" },
      {
        property: "og:description",
        content: "Compare car stats and equip the neon rides you have unlocked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GaragePage,
});

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </span>
    </div>
  );
}

function CarCard({
  car,
  unlocked,
  selected,
  progress,
  onSelect,
}: {
  car: Car;
  unlocked: boolean;
  selected: boolean;
  progress: number;
  onSelect: () => void;
}) {
  return (
    <div
      className={`panel !p-4 ${selected ? "ring-2 ring-primary" : ""} ${unlocked ? "" : "opacity-75"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-black ${rarityClass(car.rarity)}`}>{car.name}</h2>
          <p className="hud-label">{car.rarity}</p>
        </div>
        <div
          className="size-10 shrink-0 rounded-lg border"
          style={{
            background: `linear-gradient(160deg, ${car.color}, ${car.accent})`,
            borderColor: car.color,
            boxShadow: `0 0 18px ${car.color}66`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{car.description}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        <Stat label="Speed" value={car.speed} />
        <Stat label="Handling" value={car.handling} />
        <Stat label="Accel" value={car.acceleration} />
        <Stat label="Braking" value={car.braking} />
      </div>

      <div className="mt-4">
        {unlocked ? (
          <button className={selected ? "btn-ghost w-full" : "btn-neon w-full"} onClick={onSelect} disabled={selected}>
            {selected ? (
              <>
                <Check className="size-4" /> Equipped
              </>
            ) : (
              <>
                <Sparkles className="size-4" /> Equip
              </>
            )}
          </button>
        ) : (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Lock className="size-3.5" /> {unlockLabel(car)}
            </p>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-secondary">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function GaragePage() {
  const { user } = useSessionUser();
  const { data: cars } = useCars();
  const { data: profile } = useProfile(user?.id);
  const { data: unlocked } = useUnlockedSlugs(user?.id);
  const queryClient = useQueryClient();

  const equip = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_car_slug: slug })
        .eq("id", user!.id);
      if (error) throw error;
      setLocalCarSlug(slug);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] }),
  });

  return (
    <div className="min-h-[100dvh] bg-background">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-glow-primary text-3xl font-black tracking-tight sm:text-4xl">Garage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unlock cars by pushing your high score, racing more runs and hoarding coins. Handling changes how
          sharply your car snaps between lanes.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="stat-tile">
            <span className="hud-label">Best</span>
            <span className="text-glow-accent text-xl font-black tabular-nums">{profile?.high_score ?? 0}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Runs</span>
            <span className="text-xl font-black tabular-nums">{profile?.games_played ?? 0}</span>
          </div>
          <div className="stat-tile">
            <span className="hud-label">Coins</span>
            <span className="text-xl font-black tabular-nums">{profile?.total_coins ?? 0}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cars?.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              unlocked={!!unlocked?.includes(car.slug)}
              selected={profile?.selected_car_slug === car.slug}
              progress={unlockProgress(car, profile)}
              onSelect={() => equip.mutate(car.slug)}
            />
          ))}
        </div>
        {equip.isError && (
          <p className="mt-4 text-sm text-destructive">Could not equip that car. Try again.</p>
        )}
      </main>
    </div>
  );
}
