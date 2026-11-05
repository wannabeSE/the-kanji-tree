import type { H3Event } from "h3";
import type { KanjiStatus } from "../../shared/utils/status";
import { DAY_MS, facetStatus, kanjiStatus, type Facet } from "./srs";

export interface ItemRow {
  kanji: string;
  facet: Facet;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: number;
  suspended: number;
  created_at: number;
}

export interface UserSettings {
  email: string;
  daily_new_limit: number;
  target_jlpt: number | null;
  tz: string;
}

/** Route param → one NFC-normalized kanji. NFC folds CJK compatibility variants into their unified character. */
export function readKanjiParam(event: H3Event, name = "char"): string {
  const char = decodeURIComponent(getRouterParam(event, name) ?? "").normalize(
    "NFC",
  );
  if ([...char].length !== 1 || !/\p{Script=Han}/u.test(char))
    throw createError({ statusCode: 400, statusMessage: "Invalid kanji" });
  return char;
}

export function userItems(userId: number): Promise<ItemRow[]> {
  return dbAll<ItemRow>("SELECT * FROM srs_items WHERE user_id = ?", userId);
}

export function statusesFromItems(items: ItemRow[]): Map<string, KanjiStatus> {
  const facets = new Map<string, KanjiStatus[]>();
  for (const item of items) {
    const list = facets.get(item.kanji) ?? [];
    list.push(facetStatus(item));
    facets.set(item.kanji, list);
  }
  const statuses = new Map<string, KanjiStatus>();
  for (const [kanji, list] of facets) statuses.set(kanji, kanjiStatus(list)!);
  return statuses;
}

export async function userStatuses(userId: number) {
  return statusesFromItems(
    await dbAll<ItemRow>(
      "SELECT kanji, facet, interval_days, suspended FROM srs_items WHERE user_id = ?",
      userId,
    ),
  );
}

export async function kanjiStatusFor(
  userId: number,
  kanji: string,
): Promise<KanjiStatus | null> {
  return (
    statusesFromItems(
      await dbAll<ItemRow>(
        "SELECT kanji, facet, interval_days, suspended FROM srs_items WHERE user_id = ? AND kanji = ?",
        userId,
        kanji,
      ),
    ).get(kanji) ?? null
  );
}

export async function userSettings(userId: number): Promise<UserSettings> {
  return (await dbGet<UserSettings>(
    "SELECT email, daily_new_limit, target_jlpt, tz FROM users WHERE id = ?",
    userId,
  ))!;
}

/** Returns ms → "YYYY-MM-DD" in `tz`; reuse it in loops, building the formatter is the slow part. */
export function dayKeyer(tz: string): (ms: number) => string {
  const format = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (ms) => format.format(ms);
}

/** Monday of the week containing a "YYYY-MM-DD" key. */
export function weekStart(key: string): string {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay();
  return addDays(key, -((dow + 6) % 7));
}

/** New cards (facets) the user may still start today. */
export async function newCardsLeftToday(
  userId: number,
  settings: UserSettings,
  now: number,
) {
  const started = (await dbGet<{ n: number }>(
    "SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND reviewed_at >= ? AND prev_interval = 0",
    userId,
    startOfLocalDay(now, settings.tz),
  ))!.n;
  return Math.max(0, settings.daily_new_limit - started);
}

/** Moves a "YYYY-MM-DD" key by whole days. */
export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Epoch ms of the most recent local midnight in `tz`. */
export function startOfLocalDay(now: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  // ponytail: off by the DST shift on the two transition days a year.
  return (
    now -
    ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 -
    (now % 1000)
  );
}
