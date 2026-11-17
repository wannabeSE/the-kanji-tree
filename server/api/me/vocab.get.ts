/**
 * JLPT words whose every kanji the user has passed (young or mature).
 * Kana-only words are included. ?kanji=木林 limits the list to words
 * containing those characters.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const statuses = await userStatuses(userId);
  const passed = new Set(
    [...statuses]
      .filter(([, s]) => s === "young" || s === "mature")
      .map(([k]) => k),
  );

  const query = getQuery(event).kanji;
  const restrict =
    typeof query === "string" && query
      ? new Set([...query.normalize("NFC")].filter((k) => passed.has(k)))
      : null;

  const seen = new Set<string>();
  const words = allVocabWords().filter((word) => {
    const key = `${word.written}|${word.pronounced}`;
    if (seen.has(key)) return false;
    const chars = [...word.written];
    if (restrict && !chars.some((c) => restrict.has(c))) return false;
    if (!chars.every((c) => !/\p{Script=Han}/u.test(c) || passed.has(c)))
      return false;
    seen.add(key);
    return true;
  });

  return { words, basedOn: restrict ? [...restrict] : [...passed] };
});
