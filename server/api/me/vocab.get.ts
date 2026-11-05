/**
 * Common words whose every kanji the user has passed (young or mature).
 * ?kanji=木林 limits the search to words containing those characters;
 * by default it uses the 40 most recently reviewed passed kanji.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const statuses = userStatuses(userId);
  const passed = new Set(
    [...statuses]
      .filter(([, s]) => s === "young" || s === "mature")
      .map(([k]) => k),
  );

  const query = getQuery(event).kanji;
  // ponytail: words are fetched per kanji (8 most common each); 40 keeps a cold cache under a few seconds.
  const basedOn =
    typeof query === "string" && query
      ? [...new Set(query.normalize("NFC"))]
          .filter((k) => passed.has(k))
          .slice(0, 40)
      : recentKanji(userId, statuses, ["young", "mature"], 40);

  const lists = await Promise.all(
    basedOn.map((k) => fetchCommonWords(k).catch(() => [])),
  );
  const seen = new Set<string>();
  const words = lists.flat().filter((word) => {
    const key = `${word.written}|${word.pronounced}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return [...word.written].every(
      (c) => !/\p{Script=Han}/u.test(c) || passed.has(c),
    );
  });

  return { words, basedOn };
});
