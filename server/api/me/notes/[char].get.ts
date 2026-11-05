export default defineEventHandler((event) => {
  const kanji = readKanjiParam(event);
  const row = dbGet<{ mnemonic: string }>(
    "SELECT mnemonic FROM notes WHERE user_id = ? AND kanji = ?",
    meId(event),
    kanji,
  );
  return { kanji, mnemonic: row?.mnemonic ?? "" };
});
