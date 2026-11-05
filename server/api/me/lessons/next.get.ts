/** The next kanji to learn: components before the kanji built from them, target JLPT first, then newspaper rank. */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const count = Math.min(Math.max(Number(getQuery(event).count) || 5, 1), 10);
  const settings = await userSettings(userId);

  const statuses = await userStatuses(userId);
  const started = [...statuses]
    .filter(([, s]) => s !== "suspended")
    .map(([k]) => k);
  const candidates = allKanji().filter((k) => !statuses.has(k));
  const picks = pickLessons(candidates, started, settings.target_jlpt, count);

  const notes = new Map(
    (
      await dbAll<{ kanji: string; mnemonic: string }>(
        "SELECT kanji, mnemonic FROM notes WHERE user_id = ?",
        userId,
      )
    ).map((n) => [n.kanji, n.mnemonic]),
  );
  const lessons = await Promise.all(
    picks.map(async (kanji) => ({
      kanji,
      entry: await fetchKanjiEntry(kanji),
      words: (await fetchCommonWords(kanji).catch(() => [])).slice(0, 3),
      mnemonic: notes.get(kanji) ?? "",
    })),
  );
  return {
    lessons: lessons.filter((l) => l.entry),
    remaining: candidates.length,
  };
});
