const MAX_ROWS = 200_000;

const isKanji = (v: unknown): v is string =>
  typeof v === "string" && [...v].length === 1 && /\p{Script=Han}/u.test(v);
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/**
 * Restores a JSON export. Cards and notes in the file replace the ones you
 * have; reviews already present (same kanji, facet, and time) are skipped.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const body = await readBody<Record<string, unknown> | null>(event);
  if (body?.version !== 1)
    throw createError({
      statusCode: 400,
      statusMessage: "Not a Kanji Tree export file",
    });

  const list = (v: unknown) =>
    Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
  const items = list(body.items);
  const reviews = list(body.reviews);
  const notes = list(body.notes);
  if (items.length + reviews.length + notes.length > MAX_ROWS)
    throw createError({ statusCode: 413, statusMessage: "File is too large" });

  const validItem = (i: Record<string, unknown>) =>
    isKanji(i.kanji) &&
    FACETS.includes(i.facet as Facet) &&
    num(i.ease, MIN_EASE, 10) &&
    num(i.interval_days, 0, 365 * 100) &&
    num(i.reps, 0, 1e6) &&
    num(i.lapses, 0, 1e6) &&
    num(i.due_at, 0, Date.now() + 365 * 100 * DAY_MS) &&
    (i.suspended === 0 || i.suspended === 1);
  const validReview = (r: Record<string, unknown>) =>
    isKanji(r.kanji) &&
    FACETS.includes(r.facet as Facet) &&
    [1, 2, 3, 4].includes(r.grade as number) &&
    num(r.prev_interval, 0, 365 * 100) &&
    num(r.new_interval, 0, 365 * 100) &&
    num(r.reviewed_at, 0, Date.now() + DAY_MS);
  const validNote = (n: Record<string, unknown>) =>
    isKanji(n.kanji) &&
    typeof n.mnemonic === "string" &&
    n.mnemonic.trim().length > 0 &&
    n.mnemonic.length <= 2000;

  const counts = { items: 0, reviews: 0, notes: 0, skipped: 0 };
  const now = Date.now();
  await tx(async () => {
    for (const i of items) {
      if (!validItem(i)) {
        counts.skipped++;
        continue;
      }
      await dbRun(
        `INSERT INTO srs_items (user_id, kanji, facet, ease, interval_days, reps, lapses, due_at, suspended, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, kanji, facet) DO UPDATE SET ease = excluded.ease,
           interval_days = excluded.interval_days, reps = excluded.reps, lapses = excluded.lapses,
           due_at = excluded.due_at, suspended = excluded.suspended`,
        userId,
        (i.kanji as string).normalize("NFC"),
        i.facet as string,
        i.ease as number,
        i.interval_days as number,
        i.reps as number,
        i.lapses as number,
        i.due_at as number,
        i.suspended as number,
        num(i.created_at, 0, now) ? (i.created_at as number) : now,
      );
      counts.items++;
    }
    for (const r of reviews) {
      if (!validReview(r)) {
        counts.skipped++;
        continue;
      }
      const kanji = (r.kanji as string).normalize("NFC");
      const exists = await dbGet(
        "SELECT 1 FROM reviews WHERE user_id = ? AND kanji = ? AND facet = ? AND reviewed_at = ?",
        userId,
        kanji,
        r.facet as string,
        r.reviewed_at as number,
      );
      if (exists) continue;
      await dbRun(
        `INSERT INTO reviews (user_id, kanji, facet, grade, prev_interval, new_interval, duration_ms, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        userId,
        kanji,
        r.facet as string,
        r.grade as number,
        r.prev_interval as number,
        r.new_interval as number,
        num(r.duration_ms, 0, 600_000) ? (r.duration_ms as number) : null,
        r.reviewed_at as number,
      );
      counts.reviews++;
    }
    for (const n of notes) {
      if (!validNote(n)) {
        counts.skipped++;
        continue;
      }
      await dbRun(
        `INSERT INTO notes (user_id, kanji, mnemonic, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id, kanji) DO UPDATE SET mnemonic = excluded.mnemonic, updated_at = excluded.updated_at`,
        userId,
        (n.kanji as string).normalize("NFC"),
        (n.mnemonic as string).trim(),
        now,
      );
      counts.notes++;
    }
  });
  return counts;
});
