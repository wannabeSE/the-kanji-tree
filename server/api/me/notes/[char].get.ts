export default defineEventHandler(async (event) => {
  const kanji = readKanjiParam(event);
  const row = await dbGet<{ mnemonic: string }>(
    "SELECT mnemonic FROM notes WHERE user_id = ? AND kanji = ?",
    meId(event),
    kanji,
  );
  return { kanji, mnemonic: row?.mnemonic ?? "" };
});
