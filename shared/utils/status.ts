/**
 * new: never reviewed. learning: interval under 1 day. young: 1-20 days.
 * mature: 21+ days, which is what "known" means everywhere in the app.
 */
export type KanjiStatus = "new" | "learning" | "young" | "mature" | "suspended";

export type StudyAction = "learn" | "known" | "ignore" | "reset";

export const STATUS_ORDER: KanjiStatus[] = [
  "new",
  "learning",
  "young",
  "mature",
  "suspended",
];
