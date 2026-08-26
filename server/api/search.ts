/**
 * Query params: q (kanji character or reading)
 */
export default defineEventHandler(async (event) => {
  const qRaw = getQuery(event).q;
  const q = typeof qRaw === "string" ? qRaw.trim() : "";

  let hits = searchKanjiGraph(q);

  if (q && !hits.length) {
    try {
      hits = await searchByReadingOrChar(q);
    } catch {
      hits = [];
    }
  }

  return {
    query: { q },
    count: hits.length,
    results: hits.map((kanji) => ({ kanji })),
  };
});

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
  ];
}
