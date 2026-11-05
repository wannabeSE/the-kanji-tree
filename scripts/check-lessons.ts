/**
 * Self-check for the lesson recommender.
 * Usage: npx tsx scripts/check-lessons.ts
 */
import assert from "node:assert/strict";
import { allKanji, getJlpt } from "../server/utils/getKanjiGraph";
import { pickLessons, readiness } from "../server/utils/lessons";

// 森 is built from 木 and 林.
assert.equal(readiness("森", new Set()), 2);
assert.equal(readiness("森", new Set(["木"])), 1);
assert.equal(readiness("森", new Set(["木", "林"])), 0);
assert.equal(readiness("木", new Set()), 0);

// A component is picked before the kanji built from it, even in one batch.
assert.deepEqual(pickLessons(["森", "林", "木"], [], null, 3), [
  "木",
  "林",
  "森",
]);

// Within the target level, newspaper rank decides: 日 (#1) before 人 (#5) before 木 (#317).
assert.deepEqual(pickLessons(["木", "人", "日"], [], 5, 3), ["日", "人", "木"]);

// Never a kanji whose components are all unknown while another candidate exists.
const all = allKanji();
const batch = pickLessons(all, [], 5, 40);
const started = new Set<string>();
for (const char of batch) {
  assert.notEqual(
    readiness(char, started),
    2,
    `${char} picked before any of its parts`,
  );
  started.add(char);
}
assert.ok(
  batch.every((c) => getJlpt(c) === 5),
  "target N5 comes first while N5 kanji are ready",
);

// It does fall back when only unready kanji remain.
assert.deepEqual(pickLessons(["森"], [], null, 1), ["森"]);

console.log("check-lessons: ok");
