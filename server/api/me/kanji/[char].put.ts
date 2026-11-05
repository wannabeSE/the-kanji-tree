import type { StudyAction } from "#shared/utils/status";

const ACTIONS: StudyAction[] = ["learn", "known", "ignore", "reset"];

/**
 * learn: add both facets as new cards (keeps existing progress).
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
  tx(() => {
    if (action === "reset") {
      dbRun(
        "DELETE FROM srs_items WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      );
      return;
    }
    for (const facet of FACETS) {
      dbRun(
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
      dbRun(
        "UPDATE srs_items SET suspended = 0 WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      );
    } else if (action === "ignore") {
      dbRun(
        "UPDATE srs_items SET suspended = 1 WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      );
    } else {
      dbRun(
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

  return { kanji, status: kanjiStatusFor(userId, kanji) };
});
