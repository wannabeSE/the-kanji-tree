interface Card {
  kanji: string;
  facet: Facet;
  isNew: boolean;
}

/** Due cards first (oldest due first), then new cards up to today's limit in learning-path order. */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const settings = userSettings(userId);
  const now = Date.now();

  const due = dbAll<Omit<Card, "isNew">>(
    `SELECT kanji, facet FROM srs_items
     WHERE user_id = ? AND suspended = 0 AND interval_days > 0 AND due_at <= ?
     ORDER BY due_at LIMIT 200`,
    userId,
    now,
  ).map((c) => ({ ...c, isNew: false }));

  const fresh = dbAll<Omit<Card, "isNew">>(
    "SELECT kanji, facet FROM srs_items WHERE user_id = ? AND suspended = 0 AND interval_days = 0",
    userId,
  );
  const statuses = userStatuses(userId);
  const started = [...statuses]
    .filter(([, s]) => s !== "new" && s !== "suspended")
    .map(([k]) => k);
  const freshKanji = [...new Set(fresh.map((c) => c.kanji))];
  const order = pickLessons(
    freshKanji,
    started,
    settings.target_jlpt,
    freshKanji.length,
  );
  const rank = new Map(order.map((k, i) => [k, i]));
  const newCards = fresh
    .sort(
      (a, b) =>
        rank.get(a.kanji)! - rank.get(b.kanji)! ||
        FACETS.indexOf(a.facet) - FACETS.indexOf(b.facet),
    )
    .slice(0, newCardsLeftToday(userId, settings, now))
    .map((c) => ({ ...c, isNew: true }));

  const cards: Card[] = [...due, ...newCards];
  const kanji = [...new Set(cards.map((c) => c.kanji))];
  await prefetchKanji(kanji.slice(0, 10));

  const notes = kanji.length
    ? dbAll<{ kanji: string; mnemonic: string }>(
        `SELECT kanji, mnemonic FROM notes WHERE user_id = ? AND kanji IN (${kanji.map(() => "?").join(",")})`,
        userId,
        ...kanji,
      )
    : [];

  return {
    cards,
    due: due.length,
    new: newCards.length,
    notes: Object.fromEntries(notes.map((n) => [n.kanji, n.mnemonic])),
  };
});
