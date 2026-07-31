import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Game } from "@/components/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Traffic Dodge — Neon Endless Car Dodging Game" },
      {
        name: "description",
        content:
          "Dodge neon highway traffic in this endless arcade racer. Chain near-miss combos, grab boosts and beat your high score on desktop or mobile.",
      },
      { property: "og:title", content: "Traffic Dodge — Neon Endless Car Dodging Game" },
      {
        property: "og:description",
        content:
          "Dodge neon highway traffic in this endless arcade racer. Chain near-miss combos, grab boosts and beat your high score on desktop or mobile.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <h1 className="sr-only">Traffic Dodge — endless neon traffic dodging car game</h1>
      <ClientOnly fallback={<div className="h-[100dvh] w-full bg-background" />}>
        <Game />
      </ClientOnly>
    </main>
  );
}
