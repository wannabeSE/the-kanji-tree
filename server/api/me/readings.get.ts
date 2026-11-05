/**
 * Reading families: for the primary on reading of recently studied kanji,
 * how many of the Jōyō kanji sharing that reading the user knows.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const statuses = userStatuses(userId);
  // ponytail: 12 recent kanji bounds the kanjiapi.dev calls on a cold cache.
  const recent = recentKanji(
    userId,
    statuses,
    ["learning", "young", "mature"],
    12,
  );

  const entries = await Promise.all(recent.map((k) => fetchKanjiEntry(k)));
  const readings = [
    ...new Set(entries.map((e) => e?.on_readings[0]).filter(Boolean)),
  ] as string[];

  const families = await Promise.all(
    readings.map(async (reading) => {
      const entry = await fetchReading(reading);
      const kanji = (entry?.main_kanji ?? [])
        .filter((k) => getGrade(k) != null)
        .sort((a, b) => (getFreq(a) ?? 9999) - (getFreq(b) ?? 9999))
        .map((k) => ({ kanji: k, status: statuses.get(k) ?? null }));
      return {
        reading,
        total: kanji.length,
        known: kanji.filter((k) => k.status === "mature").length,
        studying: kanji.filter(
          (k) => k.status && k.status !== "mature" && k.status !== "suspended",
        ).length,
        kanji,
      };
    }),
  );
  return { families: families.filter((f) => f.total > 1) };
});
