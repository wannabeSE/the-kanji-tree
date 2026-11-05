import type { KanjiStatus } from "#shared/utils/status";
import jlptMap from "../../assets/jlpt.json";
import gradeMap from "../../assets/grade.json";
import freqMap from "../../assets/freq.json";

type Tally = Record<KanjiStatus | "untracked", number>;

const JLPT = jlptMap as Record<string, number>;
const GRADE = gradeMap as Record<string, number>;
const FREQ = freqMap as Record<string, number>;
const FREQ_BANDS = [100, 500, 1000, 2501];

export default defineEventHandler((event) => {
  const userId = meId(event);
  const settings = userSettings(userId);
  const now = Date.now();
  const toDay = dayKeyer(settings.tz);
  const today = toDay(now);

  const items = userItems(userId);
  const statuses = statusesFromItems(items);
  const tally = (chars: string[]) => {
    const t: Tally = {
      untracked: 0,
      new: 0,
      learning: 0,
      young: 0,
      mature: 0,
      suspended: 0,
    };
    for (const c of chars) t[statuses.get(c) ?? "untracked"]++;
    return { total: chars.length, ...t };
  };
  const where = (map: Record<string, number>, test: (v: number) => boolean) =>
    Object.keys(map).filter((c) => test(map[c]!));

  const tracks = [
    ...[5, 4, 3, 2, 1].map((n) => ({
      group: "jlpt",
      label: `N${n}`,
      ...tally(where(JLPT, (v) => v === n)),
    })),
    ...[1, 2, 3, 4, 5, 6, 8].map((g) => ({
      group: "grade",
      label: g === 8 ? "Secondary" : `Year ${g}`,
      ...tally(where(GRADE, (v) => v === g)),
    })),
    { group: "joyo", label: "All Jōyō", ...tally(Object.keys(GRADE)) },
  ];

  const frequency = FREQ_BANDS.map((top) => ({
    top,
    ...tally(where(FREQ, (v) => v <= top)),
  }));

  const counts = { ...tally([...statuses.keys()]), dueNow: 0, newToday: 0 };
  const newLeft = newCardsLeftToday(userId, settings, now);
  const forecast = new Map<string, number>();
  for (let i = 0; i < 14; i++) forecast.set(addDays(today, i), 0);
  let newWaiting = 0;
  for (const item of items) {
    if (item.suspended) continue;
    if (item.interval_days <= 0) {
      newWaiting++;
      continue;
    }
    if (item.due_at <= now) counts.dueNow++;
    const key = item.due_at <= now ? today : toDay(item.due_at);
    if (forecast.has(key)) forecast.set(key, forecast.get(key)! + 1);
  }
  counts.newToday = Math.min(newWaiting, newLeft);

  // ponytail: loads every review timestamp; fine for years of daily use, aggregate in SQL past ~1M rows.
  const reviews = dbAll<{
    kanji: string;
    facet: string;
    grade: number;
    reviewed_at: number;
  }>(
    "SELECT kanji, facet, grade, reviewed_at FROM reviews WHERE user_id = ? ORDER BY reviewed_at",
    userId,
  );
  const perDay = new Map<string, number>();
  const firstSeen = new Map<string, string>();
  const todayStart = startOfLocalDay(now, settings.tz);
  const accuracy = [7, 30].flatMap((days) =>
    FACETS.map((facet) => ({
      days,
      facet,
      correct: 0,
      total: 0,
      from: todayStart - (days - 1) * DAY_MS,
    })),
  );
  for (const r of reviews) {
    const key = toDay(r.reviewed_at);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
    if (!firstSeen.has(r.kanji)) firstSeen.set(r.kanji, key);
    for (const a of accuracy) {
      if (a.facet === r.facet && r.reviewed_at >= a.from) {
        a.total++;
        if (r.grade > 1) a.correct++;
      }
    }
  }

  const heatmap = Array.from({ length: 365 }, (_, i) => {
    const date = addDays(today, i - 364);
    return { date, count: perDay.get(date) ?? 0 };
  });

  let current = 0;
  for (
    let day = perDay.has(today) ? today : addDays(today, -1);
    perDay.has(day);
    day = addDays(day, -1)
  )
    current++;
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of [...perDay.keys()].sort()) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const thisWeek = weekStart(today);
  const weekly = Array.from({ length: 12 }, (_, i) => ({
    week: addDays(thisWeek, (i - 11) * 7),
    count: 0,
  }));
  for (const day of firstSeen.values()) {
    const slot = weekly.find((w) => w.week === weekStart(day));
    if (slot) slot.count++;
  }

  let goal = null;
  if (settings.target_jlpt) {
    const target = tally(where(JLPT, (v) => v >= settings.target_jlpt!));
    const remaining = target.untracked + target.new;
    const kanjiPerDay = settings.daily_new_limit / FACETS.length;
    const days = kanjiPerDay > 0 ? Math.ceil(remaining / kanjiPerDay) : null;
    goal = {
      target: settings.target_jlpt,
      ...target,
      remaining,
      kanjiPerDay,
      finishDate: days == null ? null : addDays(today, days),
    };
  }

  const leeches = dbAll<{ kanji: string; facet: string; lapses: number }>(
    `SELECT kanji, facet, lapses FROM srs_items
     WHERE user_id = ? AND suspended = 0 AND lapses >= ? ORDER BY lapses DESC LIMIT 30`,
    userId,
    LEECH_LAPSES,
  );

  return {
    settings,
    counts,
    tracks,
    frequency,
    heatmap,
    streak: { current, longest, reviewedToday: perDay.has(today) },
    accuracy: accuracy.map(({ from: _from, ...a }) => a),
    forecast: [...forecast].map(([date, count]) => ({ date, count })),
    weekly,
    goal,
    leeches,
    totalReviews: reviews.length,
  };
});
