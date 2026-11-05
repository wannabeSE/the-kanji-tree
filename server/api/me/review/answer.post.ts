export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const body = await readBody<Record<string, unknown> | null>(event);
  const kanji =
    typeof body?.kanji === "string" ? body.kanji.normalize("NFC") : "";
  const facet = body?.facet as Facet;
  const grade = body?.grade as Grade;
  if (!FACETS.includes(facet) || ![1, 2, 3, 4].includes(grade))
    throw createError({ statusCode: 400, statusMessage: "Invalid answer" });
  const durationMs = Math.min(
    Math.max(Number(body?.durationMs) || 0, 0),
    10 * 60_000,
  );

  const item = await dbGet<ItemRow>(
    "SELECT * FROM srs_items WHERE user_id = ? AND kanji = ? AND facet = ?",
    userId,
    kanji,
    facet,
  );
  if (!item)
    throw createError({ statusCode: 404, statusMessage: "Card not found" });
  if (item.suspended)
    throw createError({
      statusCode: 409,
      statusMessage: "This kanji is ignored",
    });

  const now = Date.now();
  const next = schedule(item, grade, now);
  await tx(async () => {
    await dbRun(
      `INSERT INTO reviews (user_id, kanji, facet, grade, prev_interval, new_interval, duration_ms, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      kanji,
      facet,
      grade,
      item.interval_days,
      next.interval_days,
      Math.round(durationMs),
      now,
    );
    await dbRun(
      `UPDATE srs_items SET ease = ?, interval_days = ?, reps = ?, lapses = ?, due_at = ?
       WHERE user_id = ? AND kanji = ? AND facet = ?`,
      next.ease,
      next.interval_days,
      next.reps,
      next.lapses,
      next.due_at,
      userId,
      kanji,
      facet,
    );
  });

  return {
    ...next,
    status: await kanjiStatusFor(userId, kanji),
    leech: next.lapses >= LEECH_LAPSES,
  };
});
