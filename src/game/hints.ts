/**
 * Career hint system. Hints coach the player through the CURRENT level's
 * objective — they never complete the level for them.
 */
import { getCareerLevel } from "./career";

export const HINT_COST = 25;

export interface CareerHintSet {
  level: number;
  objective: string;
  hints: string[];
}

/** True when this level is tuned to make pursuits likely (later levels). */
function hasHeavyPolice(level: number) {
  return level >= 8;
}

export function getCareerHints(level: number): CareerHintSet {
  const lvl = getCareerLevel(level);
  const objective = `Survive ${lvl.targetM.toLocaleString()} m on ${
    lvl.traffic === "twoway" ? "two-way" : "one-way"
  } traffic.`;

  const hints: string[] = [
    "💡 Focus on changing lanes early to avoid groups of traffic — decide before the gap closes.",
    "💡 Try passing close to traffic without hitting the cars to increase your Near Miss count.",
    "💡 Near Misses can help you increase your score faster, so graze safely when the lane is clear.",
  ];

  if (lvl.traffic === "twoway") {
    hints.push(
      "💡 Oncoming cars close much faster — stay on the two right lanes and read the head-on traffic early.",
    );
  }

  if (hasHeavyPolice(level)) {
    hints.push("💡 Watch for an opportunity to escape the police through a highway exit.");
  }

  if (lvl.targetM >= 1500) {
    hints.push(
      "💡 This is a long level — save the speed boost for open road and use slow-motion in heavy traffic.",
    );
  }

  if (lvl.reward) {
    hints.push("💡 Clearing this level unlocks a car in your garage, so play safe over greedy.");
  }

  hints.push("💡 Take a highway exit to switch to a calmer map — your score and distance carry over.");

  return { level: lvl.level, objective, hints };
}
