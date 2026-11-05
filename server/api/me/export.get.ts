/** ?format=json (default, re-importable) or ?format=csv (one row per card, for spreadsheets). */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const format = getQuery(event).format === "csv" ? "csv" : "json";
  const items = await userItems(userId);
  const notes = await dbAll<{
    kanji: string;
    mnemonic: string;
    updated_at: number;
  }>("SELECT kanji, mnemonic, updated_at FROM notes WHERE user_id = ?", userId);
  const stamp = new Date().toISOString().slice(0, 10);
  setHeader(
    event,
    "Content-Disposition",
    `attachment; filename="kanji-tree-${stamp}.${format}"`,
  );

  if (format === "json") {
    setHeader(event, "Content-Type", "application/json; charset=utf-8");
    const reviews = await dbAll(
      `SELECT kanji, facet, grade, prev_interval, new_interval, duration_ms, reviewed_at
       FROM reviews WHERE user_id = ? ORDER BY reviewed_at`,
      userId,
    );
    const cards = items.map(
      ({
        kanji,
        facet,
        ease,
        interval_days,
        reps,
        lapses,
        due_at,
        suspended,
        created_at,
      }) => ({
        kanji,
        facet,
        ease,
        interval_days,
        reps,
        lapses,
        due_at,
        suspended,
        created_at,
      }),
    );
    return JSON.stringify(
      { version: 1, exported_at: Date.now(), items: cards, reviews, notes },
      null,
      1,
    );
  }

  setHeader(event, "Content-Type", "text/csv; charset=utf-8");
  const mnemonics = new Map(notes.map((n) => [n.kanji, n.mnemonic]));
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = items.map((i) =>
    [
      i.kanji,
      i.facet,
      facetStatus(i),
      i.ease,
      Math.round(i.interval_days * 100) / 100,
      i.reps,
      i.lapses,
      new Date(i.due_at).toISOString(),
      i.suspended,
      mnemonics.get(i.kanji) ?? "",
    ]
      .map(cell)
      .join(","),
  );
  return [
    "kanji,facet,status,ease,interval_days,reps,lapses,due,suspended,mnemonic",
    ...rows,
  ].join("\n");
});
