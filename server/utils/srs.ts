import type { KanjiStatus } from "../../shared/utils/status";

export type Facet = "meaning" | "reading";
export const FACETS: Facet[] = ["meaning", "reading"];

/**
 * The meaning and reading of one kanji should not sit next to each other.
 * The first card for each kanji stays in order; the rest follow after.
 */
export function spaceFacets<T extends { kanji: string }>(cards: T[]): T[] {
  const first: T[] = [];
  const rest: T[] = [];
  const seen = new Set<string>();
  for (const card of cards) {
    if (seen.has(card.kanji)) rest.push(card);
    else {
      seen.add(card.kanji);
      first.push(card);
    }
  }
  return rest.length ? [...first, ...spaceFacets(rest)] : first;
}

/** 1 Again, 2 Hard, 3 Good, 4 Easy */
export type Grade = 1 | 2 | 3 | 4;

export interface SrsState {
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
}

export const DAY_MS = 86_400_000;
export const MIN_EASE = 1.3;
export const LEARN_STEP_DAYS = 10 / 1440;
export const MATURE_DAYS = 21;
export const LEECH_LAPSES = 8;

/**
 * SM-2 with Anki-style buttons. `reps` counts consecutive passes and drives
 * the 1 day, then 6 days, then interval × ease ladder; Again resets it.
 */
export function schedule(
  item: SrsState,
  grade: Grade,
  now: number,
): SrsState & { due_at: number } {
  let { ease, interval_days: interval, reps, lapses } = item;

  if (grade === 1) {
    interval = LEARN_STEP_DAYS;
    reps = 0;
    lapses += 1;
    ease -= 0.2;
  } else if (grade === 2) {
    interval = Math.max(interval * 1.2, LEARN_STEP_DAYS);
    ease -= 0.15;
  } else {
    const good = reps === 0 ? 1 : reps === 1 ? 6 : interval * ease;
    interval = grade === 4 ? (reps === 0 ? 4 : good * 1.3) : good;
    if (grade === 4) ease += 0.15;
    reps += 1;
  }

  ease = Math.max(MIN_EASE, Math.round(ease * 100) / 100);
  return {
    ease,
    interval_days: interval,
    reps,
    lapses,
    due_at: now + Math.round(interval * DAY_MS),
  };
}

export function facetStatus(item: {
  interval_days: number;
  suspended: number | boolean;
}): KanjiStatus {
  if (item.suspended) return "suspended";
  if (item.interval_days <= 0) return "new";
  if (item.interval_days < 1) return "learning";
  if (item.interval_days < MATURE_DAYS) return "young";
  return "mature";
}

/** A kanji is only as far along as its weakest unsuspended facet. */
export function kanjiStatus(facets: KanjiStatus[]): KanjiStatus | null {
  if (!facets.length) return null;
  const active = facets.filter((s) => s !== "suspended");
  if (!active.length) return "suspended";
  const rank: Record<KanjiStatus, number> = {
    new: 0,
    learning: 1,
    young: 2,
    mature: 3,
    suspended: 4,
  };
  return active.reduce((a, b) => (rank[b] < rank[a] ? b : a));
}
