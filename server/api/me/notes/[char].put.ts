/** An empty mnemonic deletes the note. */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const kanji = readKanjiParam(event);
  const body = await readBody<{ mnemonic?: unknown } | null>(event);
  const mnemonic =
    typeof body?.mnemonic === "string" ? body.mnemonic.trim() : "";
  if (mnemonic.length > 2000)
    throw createError({
      statusCode: 400,
      statusMessage: "Keep mnemonics under 2,000 characters",
    });

  if (mnemonic) {
    dbRun(
      `INSERT INTO notes (user_id, kanji, mnemonic, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, kanji) DO UPDATE SET mnemonic = excluded.mnemonic, updated_at = excluded.updated_at`,
      userId,
      kanji,
      mnemonic,
      Date.now(),
    );
  } else {
    dbRun("DELETE FROM notes WHERE user_id = ? AND kanji = ?", userId, kanji);
  }
  return { kanji, mnemonic };
});
