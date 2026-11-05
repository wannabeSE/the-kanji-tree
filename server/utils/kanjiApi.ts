/**
 * Cached reads from kanjiapi.dev. Cached by hand: defineCachedEventHandler
 * keys a route once, so every character would share the first payload.
 */
import {
  getTransforms,
  pickCommonWords,
  type ApiWord,
  type CommonWord,
  type KanjiTransform,
} from "./getKanjiGraph";

const API = "https://kanjiapi.dev/v1";

export interface KanjiEntry {
  kanji: string;
  meanings: string[];
  on_readings: string[];
  kun_readings: string[];
  name_readings: string[];
  heisig_en: string | null;
  stroke_count: number;
  alternate_stroke_counts?: number[];
  jlpt: number | null;
  grade: number | null;
  freq_mainichi_shinbun: number | null;
  notes?: string[];
  unicode: string;
  fromParents: KanjiTransform[];
  toChildren: KanjiTransform[];
}

/** null when the character is unknown or kanjiapi.dev is down (neither is cached). */
export async function fetchKanjiEntry(
  char: string,
): Promise<KanjiEntry | null> {
  const storage = useStorage("cache");
  const cacheKey = `kanji:v5:${char}`;
  if (await storage.hasItem(cacheKey))
    return (await storage.getItem<KanjiEntry>(cacheKey))!;

  const apiData = await $fetch<Omit<KanjiEntry, "fromParents" | "toChildren">>(
    `${API}/kanji/${encodeURIComponent(char)}`,
  ).catch(() => null);
  if (!apiData) return null;

  const payload: KanjiEntry = { ...apiData, ...getTransforms(char) };
  await storage.setItem(cacheKey, payload, { ttl: 86400 });
  return payload;
}

/**
 * Most common dictionary words containing the kanji.
 * Upstream payloads are 200-600 KB; only the trimmed list is cached.
 * Throws instead of returning [] so an upstream outage isn't cached for a week.
 */
export async function fetchCommonWords(char: string): Promise<CommonWord[]> {
  const storage = useStorage("cache");
  const cacheKey = `words:v3:${char}`;
  if (await storage.hasItem(cacheKey))
    return (await storage.getItem<{ words: CommonWord[] }>(cacheKey))!.words;

  const words = await $fetch<ApiWord[]>(
    `${API}/words/${encodeURIComponent(char)}`,
  ).catch(() => {
    throw createError({ statusCode: 502, statusMessage: "Words unavailable" });
  });
  const payload = { kanji: char, words: pickCommonWords(words, char) };
  await storage.setItem(cacheKey, payload, { ttl: 60 * 60 * 24 * 7 });
  return payload.words;
}

export interface ReadingEntry {
  reading: string;
  main_kanji: string[];
  name_kanji: string[];
}

export async function fetchReading(
  reading: string,
): Promise<ReadingEntry | null> {
  const storage = useStorage("cache");
  const cacheKey = `reading:v1:${reading}`;
  if (await storage.hasItem(cacheKey))
    return (await storage.getItem<ReadingEntry>(cacheKey))!;

  const entry = await $fetch<ReadingEntry>(
    `${API}/reading/${encodeURIComponent(reading)}`,
  ).catch(() => null);
  if (entry) await storage.setItem(cacheKey, entry, { ttl: 60 * 60 * 24 * 7 });
  return entry;
}

/** Warms the cache for upcoming cards so a session never waits on kanjiapi.dev. */
export async function prefetchKanji(chars: string[]) {
  await Promise.allSettled(
    chars.flatMap((c) => [fetchKanjiEntry(c), fetchCommonWords(c)]),
  );
}
