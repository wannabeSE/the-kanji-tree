/**
 * Query params: q, minFreq, maxFreq, jlpt, grade, limit, offset
 * Frequency rank: lower = more common. limit/offset paginate after filtering.
 * grade is 1–6 or 8. With no rank bounds, that year is returned most-common first.
 */
import {
  allKanji,
  filterByFreq,
  getFreq,
  getGrade,
  getJlpt,
  searchKanjiGraph,
} from "../utils/getKanjiGraph";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const qRaw = query.q;
  const q = typeof qRaw === "string" ? qRaw.trim() : "";
  const minFreq = parseBound(query.minFreq);
  const maxFreq = parseBound(query.maxFreq);
  const jlpt = parseJlpt(query.jlpt);
  const grade = parseGrade(query.grade);
  const limit = parseBound(query.limit);
  const offset = parseBound(query.offset) ?? 0;

  let hits = q
    ? searchKanjiGraph(q)
    : minFreq != null || maxFreq != null || jlpt != null || grade != null
      ? allKanji()
      : [];

  if (q && !hits.length) {
    try {
      hits = await searchByReadingOrChar(q);
    } catch {
      hits = [];
    }
  }

  hits = filterByFreq(hits, minFreq, maxFreq);
  if (jlpt != null) hits = hits.filter((char) => getJlpt(char) === jlpt);
  if (grade != null) {
    hits = hits.filter((char) => getGrade(char) === grade);
    if (minFreq == null && maxFreq == null) {
      hits.sort((a, b) => (getFreq(a) ?? 9999) - (getFreq(b) ?? 9999));
    }
  }
  const total = hits.length;

  if (limit != null && limit > 0) {
    hits = hits.slice(Math.max(0, offset), Math.max(0, offset) + limit);
  }

  return {
    query: { q, minFreq, maxFreq, jlpt, grade, limit, offset },
    count: total,
    results: hits.map((kanji) => ({
      kanji,
      freq: getFreq(kanji),
      jlpt: getJlpt(kanji),
    })),
  };
});

function parseBound(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseJlpt(value: unknown): number | null {
  const n = parseBound(value);
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : null;
}

function parseGrade(value: unknown): number | null {
  const n = parseBound(value);
  return n === 1 ||
    n === 2 ||
    n === 3 ||
    n === 4 ||
    n === 5 ||
    n === 6 ||
    n === 8
    ? n
    : null;
}

async function searchByReadingOrChar(q: string): Promise<string[]> {
  if ([...q].length === 1) {
    const entry = await $fetch<{ kanji?: string }>(
      `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(q)}`,
    );
    return entry?.kanji ? [entry.kanji] : [];
  }

  const reading = await $fetch<{
    main_kanji?: string[];
    name_kanji?: string[];
  }>(`https://kanjiapi.dev/v1/reading/${encodeURIComponent(q)}`);
  return [
    ...new Set([...(reading.main_kanji ?? []), ...(reading.name_kanji ?? [])]),
  ].sort((a, b) => (getFreq(a) ?? 9999) - (getFreq(b) ?? 9999));
}
