/**
 * Highway maps. Taking an exit moves the player to the next map without
 * touching the run: score, distance, coins, career level and car all carry over.
 */
import type { Sky } from "./render";

export interface GameMap {
  id: string;
  name: string;
  tagline: string;
  neon: string;
  skies: Record<"day" | "sunset" | "night", Sky>;
}

export const MAPS: GameMap[] = [
  {
    id: "neon-city",
    name: "NEON CITY HIGHWAY",
    tagline: "Downtown lights and dense traffic.",
    neon: "#00e5ff",
    skies: {
      day: { top: "#123047", bottom: "#1d4f63", road: "#1b2430", shoulder: "#0f1720" },
      sunset: { top: "#3b1450", bottom: "#7a2350", road: "#1a1524", shoulder: "#120e1a" },
      night: { top: "#05060f", bottom: "#0b1026", road: "#0d1018", shoulder: "#070910" },
    },
  },
  {
    id: "coast-ridge",
    name: "COAST RIDGE ROAD",
    tagline: "Ocean air, long neon guard rails.",
    neon: "#37f5c5",
    skies: {
      day: { top: "#07384a", bottom: "#0d6d78", road: "#152a2f", shoulder: "#0a181c" },
      sunset: { top: "#5a1a4a", bottom: "#c2564f", road: "#1e1a26", shoulder: "#12101a" },
      night: { top: "#02121c", bottom: "#05303f", road: "#0a141a", shoulder: "#050c11" },
    },
  },
  {
    id: "desert-freeway",
    name: "DESERT FREEWAY",
    tagline: "Wide open asphalt and heat haze.",
    neon: "#ffb020",
    skies: {
      day: { top: "#4a3312", bottom: "#8a5a1c", road: "#2a2116", shoulder: "#191309" },
      sunset: { top: "#661a22", bottom: "#c2601f", road: "#241716", shoulder: "#160d0c" },
      night: { top: "#100a06", bottom: "#241407", road: "#14100b", shoulder: "#0b0805" },
    },
  },
  {
    id: "mountain-pass",
    name: "MOUNTAIN PASS",
    tagline: "Cold tunnels and tight shoulders.",
    neon: "#9d7bff",
    skies: {
      day: { top: "#1b2340", bottom: "#39456e", road: "#1d2130", shoulder: "#12151f" },
      sunset: { top: "#39204f", bottom: "#6a3d76", road: "#1f1a2b", shoulder: "#140f1c" },
      night: { top: "#070718", bottom: "#131335", road: "#0e0e1c", shoulder: "#080810" },
    },
  },
  {
    id: "harbor-docks",
    name: "HARBOR DOCKS",
    tagline: "Container cranes and wet reflections.",
    neon: "#ff4d8d",
    skies: {
      day: { top: "#12303a", bottom: "#204a55", road: "#1c2429", shoulder: "#101619" },
      sunset: { top: "#4a1730", bottom: "#8d2b46", road: "#211620", shoulder: "#140d13" },
      night: { top: "#06070d", bottom: "#111726", road: "#0d1116", shoulder: "#07090c" },
    },
  },
];

export function nextMapIndex(current: number) {
  return (current + 1) % MAPS.length;
}
