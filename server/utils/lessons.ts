import { getFreq, getGrade, getJlpt, getKanjiGraph } from "./getKanjiGraph";

/**
 * 0: every Jōyō component (graph parent) is already started, or it has none.
 * 1: some are. 2: none are. Non-Jōyō components can't be studied, so they don't count.
 */
export function readiness(char: string, started: Set<string>): 0 | 1 | 2 {
  const parents = getKanjiGraph(char).parents.filter(
    (p) => getGrade(p) != null,
  );
  if (!parents.length) return 0;
  const known = parents.filter((p) => started.has(p)).length;
  return known === parents.length ? 0 : known > 0 ? 1 : 2;
}

/** N5 is the easiest, so "target N3" covers N5, N4, and N3. */
export function inTarget(char: string, target: number | null): boolean {
  if (!target) return true;
  const level = getJlpt(char);
  return level != null && level >= target;
}

function sortKey(
  char: string,
  started: Set<string>,
  target: number | null,
): number[] {
  const ready = readiness(char, started);
  return [
    ready === 2 ? 1 : 0,
    inTarget(char, target) ? 0 : 1,
    ready,
    getFreq(char) ?? 9999,
    char.codePointAt(0)!,
  ];
}

function compareKeys(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/**
 * Greedy learning path: each pick counts as started for the next, so a
 * component and the kanji built from it can land in the same batch.
 * Kanji with no started components only come once nothing else is left.
 */
export function pickLessons(
  candidates: Iterable<string>,
  started: Iterable<string>,
  target: number | null,
  count: number,
): string[] {
  const pool = new Set(candidates);
  const seen = new Set(started);
  const picked: string[] = [];
  // ponytail: O(count × pool); fine for the 2,140 Jōyō kanji.
  while (picked.length < count && pool.size) {
    let best: string | null = null;
    let bestKey: number[] = [];
    for (const char of pool) {
      const key = sortKey(char, seen, target);
      if (best == null || compareKeys(key, bestKey) < 0) {
        best = char;
        bestKey = key;
      }
    }
    picked.push(best!);
    pool.delete(best!);
    seen.add(best!);
  }
  return picked;
}
