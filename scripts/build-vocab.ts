/**
 * Indexes JLPT word lists (server/assets/vocab/n5.tsv, n4.tsv, …) by kanji.
 * Usage: npm run build:vocab
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const HAN = /\p{Script=Han}/u;
const DIR = resolve(process.cwd(), "server/assets/vocab");
const OUT = resolve(process.cwd(), "server/assets/vocab.json");

export interface VocabWord {
  written: string;
  pronounced: string;
  meaning: string;
  jlpt: number;
}

/** Splits slash variants. Equal counts zip; extra readings share the written form. */
export function expandVocabRow(
  written: string,
  pronounced: string,
  meaning: string,
  jlpt: number,
): VocabWord[] {
  const writings = written.split("/").map((part) => part.trim());
  const readings = pronounced.split("/").map((part) => part.trim());
  if (writings.length === readings.length && writings.length > 1)
    return writings.map((w, i) => ({
      written: w,
      pronounced: readings[i]!,
      meaning,
      jlpt,
    }));
  if (readings.length > 1)
    return readings.map((pronounced) => ({
      written: written.trim(),
      pronounced,
      meaning,
      jlpt,
    }));
  return [
    {
      written: written.trim(),
      pronounced: pronounced.trim(),
      meaning,
      jlpt,
    },
  ];
}

function levelFromName(name: string): number | null {
  const match = /^n(\d)\.tsv$/.exec(name);
  return match ? Number(match[1]) : null;
}

function rowsFromFile(name: string, jlpt: number): VocabWord[] {
  const text = readFileSync(resolve(DIR, name), "utf-8").replace(/^\uFEFF/, "");
  const words: VocabWord[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [written = "", pronounced = "", ...rest] = line.split("\t");
    if (written.trim() === "Kanji") continue;
    const meaning = rest.join("\t").trim();
    for (const word of expandVocabRow(written, pronounced, meaning, jlpt)) {
      if (word.written && word.pronounced) words.push(word);
    }
  }
  return words;
}

export function buildVocabIndex() {
  const files = readdirSync(DIR)
    .map((name) => ({ name, jlpt: levelFromName(name) }))
    .filter((file): file is { name: string; jlpt: number } => file.jlpt != null)
    .sort((a, b) => b.jlpt - a.jlpt);

  const seen = new Set<string>();
  const words: VocabWord[] = [];
  for (const file of files) {
    for (const word of rowsFromFile(file.name, file.jlpt)) {
      const key = `${word.written}|${word.pronounced}`;
      if (seen.has(key)) continue;
      seen.add(key);
      words.push(word);
    }
  }

  const byKanji: Record<string, VocabWord[]> = {};
  const kanaOnly: VocabWord[] = [];
  for (const word of words) {
    const kanji = [...word.written].filter((char) => HAN.test(char));
    if (!kanji.length) {
      kanaOnly.push(word);
      continue;
    }
    for (const char of new Set(kanji)) {
      (byKanji[char] ??= []).push(word);
    }
  }

  const payload = { byKanji, kanaOnly, words };
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  console.log(
    `vocab.json: ${words.length} words, ${Object.keys(byKanji).length} kanji, ${kanaOnly.length} kana-only`,
  );
  return payload;
}

const isDirectRun = process.argv[1]?.includes("build-vocab");
if (isDirectRun) {
  const { byKanji, kanaOnly, words } = buildVocabIndex();
  assert.ok(words.some((w) => w.written === "赤" && w.pronounced === "あか"));
  assert.ok(
    words.some((w) => w.written === "赤い" && w.pronounced === "あかい"),
  );
  const month = words.filter((w) => w.written === "毎月");
  assert.deepEqual(month.map((w) => w.pronounced).sort(), [
    "まいげつ",
    "まいつき",
  ]);
  assert.ok(kanaOnly.some((w) => w.written === "あなた"));
  assert.ok(byKanji["木"]?.some((w) => w.written.includes("木")));
  assert.ok(words.some((w) => w.written === "挨拶" && w.jlpt === 4));
  assert.ok(words.some((w) => w.written === "相変わらず" && w.jlpt === 3));
  assert.equal(words.filter((w) => !w.jlpt).length, 0);
}
