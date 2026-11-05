import { shuffle } from "../../shared/utils/shuffle";
import { allKanji, getGrade, getJlpt, getKanjiGraph } from "./getKanjiGraph";
import type { KanjiEntry } from "./kanjiApi";

export type QuizMode = "meaning" | "reading" | "stroke" | "okurigana" | "word";
export const QUIZ_MODES: QuizMode[] = [
  "meaning",
  "reading",
  "stroke",
  "okurigana",
  "word",
];

export interface Question {
  kanji: string;
  prompt: string;
  /** Large text shown above the options (a kanji or a word). */
  display?: string;
  options: string[];
  answer: number;
  explain: string;
}

export const toHiragana = (s: string) =>
  s.replace(/[\u30a1-\u30f6]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );

/** Readings as they appear inside words: hiragana, no okurigana, no affix dashes. */
export function readingStems(entry: KanjiEntry): string[] {
  const stems = [
    ...entry.on_readings.map(toHiragana),
    ...entry.kun_readings.map((r) => r.split(".")[0]!),
  ].map((r) => r.replace(/-/g, ""));
  return [...new Set(stems.filter(Boolean))];
}

/** Every split of the full kana into stem + okurigana, as written with the kanji. */
export function okuriganaOptions(kanji: string, kun: string) {
  const [stem, ending] = kun.replace(/-/g, "").split(".") as [string, string];
  const full = stem + ending;
  const options = Array.from(
    { length: full.length - 1 },
    (_, i) => kanji + full.slice(i + 1),
  );
  return { full, correct: kanji + ending, options: [...new Set(options)] };
}

/** Swaps the kanji's reading inside a word for its other readings. null if the reading can't be found. */
export function wordReadingOptions(pronounced: string, stems: string[]) {
  const used = [...stems]
    .sort((a, b) => b.length - a.length)
    .find((s) => pronounced.includes(s));
  if (!used) return null;
  const wrong = stems
    .filter((s) => s !== used)
    .map((s) => pronounced.replace(used, s))
    .filter((p) => p !== pronounced);
  return [...new Set(wrong)];
}

export function strokeOptions(count: number, alternates: number[] = []) {
  const options = new Set([count, ...alternates]);
  for (const delta of [1, -1, 2, -2, 3]) {
    if (options.size >= 4) break;
    if (count + delta > 0) options.add(count + delta);
  }
  return [...options].slice(0, 4);
}

/** Look-alikes first (same components in the tree), then kanji sharing a reading, then same stroke count, then same JLPT level. */
export function distractorKanji(
  kanji: string,
  sameReading: string[],
  pool: KanjiEntry[],
  stroke: number,
  want = 3,
): string[] {
  const node = getKanjiGraph(kanji);
  const siblings = [
    ...node.parents,
    ...node.parents.flatMap((p) => getKanjiGraph(p).children),
    ...node.children,
  ];
  const sameStroke = pool
    .filter((e) => e.stroke_count === stroke)
    .map((e) => e.kanji);
  const level = getJlpt(kanji);
  const sameLevel = allKanji().filter((k) => getJlpt(k) === level);

  const picked: string[] = [];
  for (const group of [siblings, sameReading, sameStroke, sameLevel]) {
    for (const k of shuffle(group)) {
      if (picked.length >= want) return picked;
      if (k !== kanji && getGrade(k) != null && !picked.includes(k))
        picked.push(k);
    }
  }
  return picked;
}

/** Shuffles the options and records where the correct one landed. */
export function makeQuestion(
  base: Omit<Question, "options" | "answer">,
  correct: string,
  wrong: string[],
): Question | null {
  const unique = [...new Set(wrong.filter((w) => w !== correct))].slice(0, 3);
  if (!unique.length) return null;
  const options = shuffle([correct, ...unique]);
  return { ...base, options, answer: options.indexOf(correct) };
}
