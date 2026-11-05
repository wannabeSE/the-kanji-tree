/**
 * Self-check for the SM-2 scheduler and status thresholds.
 * Usage: npx tsx scripts/check-srs.ts
 */
import assert from "node:assert/strict";
import {
  DAY_MS,
  LEARN_STEP_DAYS,
  MIN_EASE,
  facetStatus,
  kanjiStatus,
  schedule,
  spaceFacets,
  type Grade,
  type SrsState,
} from "../server/utils/srs";

const fresh: SrsState = { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 };
const now = 1_700_000_000_000;

function run(grades: Grade[], start = fresh) {
  let state = start;
  const intervals: number[] = [];
  for (const grade of grades) {
    state = schedule(state, grade, now);
    intervals.push(Math.round(state.interval_days * 100) / 100);
  }
  return { state, intervals };
}

// Good ladder: 1 day, 6 days, then interval × ease.
assert.deepEqual(run([3, 3, 3, 3]).intervals, [1, 6, 15, 37.5]);

// Again resets to the 10-minute step, counts a lapse, drops ease, and restarts the ladder.
const lapsed = run([3, 3, 3, 1]);
assert.equal(lapsed.state.interval_days, LEARN_STEP_DAYS);
assert.equal(lapsed.state.lapses, 1);
assert.equal(lapsed.state.ease, 2.3);
assert.equal(lapsed.state.reps, 0);
assert.equal(schedule(lapsed.state, 3, now).interval_days, 1);

// Hard grows the interval by 1.2 and never drops below the learning step.
assert.equal(run([3, 3, 2]).intervals[2], 7.2);
assert.equal(schedule(fresh, 2, now).interval_days, LEARN_STEP_DAYS);

// Easy: 4 days for a new card, otherwise Good × 1.3, and ease rises.
assert.equal(schedule(fresh, 4, now).interval_days, 4);
const easy = run([3, 3, 4]);
assert.equal(easy.intervals[2], 19.5);
assert.equal(easy.state.ease, 2.65);

// Ease floor.
assert.equal(run(Array<Grade>(20).fill(1)).state.ease, MIN_EASE);

// due_at follows the interval.
assert.equal(schedule(fresh, 3, now).due_at, now + DAY_MS);

// Status thresholds and the weakest-facet rule.
assert.equal(facetStatus({ interval_days: 0, suspended: 0 }), "new");
assert.equal(
  facetStatus({ interval_days: LEARN_STEP_DAYS, suspended: 0 }),
  "learning",
);
assert.equal(facetStatus({ interval_days: 20.9, suspended: 0 }), "young");
assert.equal(facetStatus({ interval_days: 21, suspended: 0 }), "mature");
assert.equal(facetStatus({ interval_days: 40, suspended: 1 }), "suspended");
assert.equal(kanjiStatus(["mature", "learning"]), "learning");
assert.equal(kanjiStatus(["mature", "suspended"]), "mature");
assert.equal(kanjiStatus(["suspended", "suspended"]), "suspended");
assert.equal(kanjiStatus([]), null);

// Meaning and reading of the same kanji are not reviewed back to back.
const paired = ["木", "林", "森"].flatMap((kanji) => [
  { kanji, facet: "meaning" as const },
  { kanji, facet: "reading" as const },
]);
assert.deepEqual(
  spaceFacets(paired).map((card) => `${card.kanji}:${card.facet}`),
  [
    "木:meaning",
    "林:meaning",
    "森:meaning",
    "木:reading",
    "林:reading",
    "森:reading",
  ],
);
assert.deepEqual(spaceFacets(paired.slice(0, 2)), paired.slice(0, 2));

console.log("check-srs: ok");
