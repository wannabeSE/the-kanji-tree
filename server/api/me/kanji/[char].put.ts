import type { StudyAction } from "#shared/utils/status";

const ACTIONS: StudyAction[] = ["learn", "known", "ignore", "reset"];

/**
 * learn: add both facets and make a first-time card due now (keeps existing progress).
 * known: both facets at a 21-day interval, so they count as mature now.
 * ignore: suspend both facets. reset: forget the kanji entirely.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const kanji = readKanjiParam(event);
  const body = await readBody<{ action?: unknown } | null>(event);
  const action = body?.action as StudyAction;
  if (!ACTIONS.includes(action))
    throw createError({ statusCode: 400, statusMessage: "Unknown action" });

  const now = Date.now();
  await tx(async () => {
    if (action === "reset") {
      await dbRun(
        "DELETE FROM srs_items WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      );
      return;
    }
    for (const facet of FACETS) {
      await dbRun(
        `INSERT INTO srs_items (user_id, kanji, facet, due_at, created_at)
         VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
        userId,
        kanji,
        facet,
        now,
        now,
      );
    }
    if (action === "learn") {
      // A finished lesson is already studied, so it belongs in Review now,
      // not behind the daily new-card cap. Cards with a real interval stay put.
      await dbRun(
        `UPDATE srs_items
         SET suspended = 0,
             due_at = CASE WHEN interval_days <= 0 THEN ? ELSE due_at END,
             interval_days = CASE WHEN interval_days <= 0 THEN ? ELSE interval_days END
         WHERE user_id = ? AND kanji = ?`,
        now,
        LEARN_STEP_DAYS,
        userId,
        kanji,
      );
    } else if (action === "ignore") {
      await dbRun(
        "UPDATE srs_items SET suspended = 1 WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      );
    } else {
      await dbRun(
        `UPDATE srs_items SET suspended = 0, reps = MAX(reps, 2),
           interval_days = MAX(interval_days, ?), due_at = ?
         WHERE user_id = ? AND kanji = ?`,
        MATURE_DAYS,
        now + MATURE_DAYS * DAY_MS,
        userId,
        kanji,
      );
    }
  });

  return { kanji, status: await kanjiStatusFor(userId, kanji) };
});
