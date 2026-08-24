/**
 * ofetch wrapper for kanjiapi.dev
 * @see https://kanjiapi.dev/
 */

const KANJI_API_BASE = "https://kanjiapi.dev/v1";

export interface KanjiApiEntry {
  kanji: string;
  grade: number | null;
  stroke_count: number;
  meanings: string[];
  kun_readings: string[];
  on_readings: string[];
  name_readings: string[];
  jlpt: number | null;
  unicode: string;
  heisig_en?: string;
}

export async function fetchKanji(char: string): Promise<KanjiApiEntry> {
  return await $fetch<KanjiApiEntry>(
    `${KANJI_API_BASE}/kanji/${encodeURIComponent(char)}`,
  );
}

export async function searchKanji(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  // Exact character lookup — kanjiapi.dev has no /search endpoint
  if ([...q].length === 1) {
    const entry = await $fetch<KanjiApiEntry>(
      `${KANJI_API_BASE}/kanji/${encodeURIComponent(q)}`,
    );
    return entry?.kanji ? [entry.kanji] : [];
  }

  const reading = await $fetch<{
    main_kanji?: string[];
    name_kanji?: string[];
  }>(`${KANJI_API_BASE}/reading/${encodeURIComponent(q)}`);
  return [
    ...new Set([...(reading.main_kanji ?? []), ...(reading.name_kanji ?? [])]),
  ];
}

export async function fetchReading(
  reading: string,
): Promise<{ reading: string; main_kanji: string[]; name_kanji: string[] }> {
  return await $fetch(
    `${KANJI_API_BASE}/reading/${encodeURIComponent(reading)}`,
  );
}
