import type { KanjiStatus } from "../../shared/utils/status";

/** Most recently reviewed kanji whose status is in `only`, newest first. */
export async function recentKanji(
  userId: number,
  statuses: Map<string, KanjiStatus>,
  only: KanjiStatus[],
  limit: number,
): Promise<string[]> {
  return (
    await dbAll<{ kanji: string }>(
      "SELECT kanji FROM reviews WHERE user_id = ? GROUP BY kanji ORDER BY MAX(reviewed_at) DESC",
      userId,
    )
  )
    .map((r) => r.kanji)
    .filter((k) => only.includes(statuses.get(k)!))
    .slice(0, limit);
}
