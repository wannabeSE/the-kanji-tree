/**
 * Self-check for pickCommonWords.
 * Usage: npx tsx scripts/check-words.ts
 */
import assert from "node:assert/strict";
import { pickCommonWords, type ApiWord } from "../server/utils/getKanjiGraph";

const word = (
  gloss: string,
  ...variants: [string, string, string[]][]
): ApiWord => ({
  meanings: [{ glosses: [gloss] }],
  variants: variants.map(([written, pronounced, priorities]) => ({
    written,
    pronounced,
    priorities,
  })),
});

const words: ApiWord[] = [
  word(
    "ruler",
    ["定規", "じょうぎ", ["ichi1", "nf36"]],
    ["定木", "じょうぎ", []],
  ),
  word("Jupiter", ["木星", "もくせい", ["news1", "nf13"]]),
  word("Thursday", ["木曜日", "もくようび", ["ichi1"]]),
  word("tree", ["木", "き", ["ichi1"]]),
  word("rare", ["木霊", "こだま", []]),
];

const picked = pickCommonWords(words, "木");
assert.deepEqual(
  picked.map((w) => w.written),
  ["木星", "木", "木曜日"],
  "ranks by nf, then shorter; skips untagged and variants without the kanji",
);
assert.deepEqual(picked[0], {
  written: "木星",
  pronounced: "もくせい",
  meaning: "Jupiter",
});
assert.equal(pickCommonWords(words, "木", 1).length, 1);

console.log("check-words: ok");
