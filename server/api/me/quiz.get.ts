import jlptMap from "../../assets/jlpt.json";

/**
 * Practice questions from the kanji the user is studying (or their target
 * JLPT level if they have fewer than 4). Quiz answers don't touch the SRS.
 */
export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const query = getQuery(event);
  const mode = query.mode as QuizMode;
  if (!QUIZ_MODES.includes(mode))
    throw createError({ statusCode: 400, statusMessage: "Unknown quiz mode" });
  const count = Math.min(Math.max(Number(query.count) || 10, 1), 20);

  const statuses = userStatuses(userId);
  let pool = [...statuses].filter(([, s]) => s !== "suspended").map(([k]) => k);
  if (pool.length < 4) {
    const level = userSettings(userId).target_jlpt ?? 5;
    pool = Object.entries(jlptMap as Record<string, number>)
      .filter(([k, v]) => v === level && getGrade(k) != null)
      .map(([k]) => k);
  }

  // Sample extra: not every kanji yields every question type (okurigana needs a kun reading with one).
  const sample = shuffle(pool).slice(0, count * 3);
  const entries = (
    await Promise.all(sample.map((k) => fetchKanjiEntry(k)))
  ).filter((e): e is KanjiEntry => e != null);

  const questions: Question[] = [];
  for (const entry of entries) {
    if (questions.length >= count) break;
    const question = await build(mode, entry, entries).catch(() => null);
    if (question) questions.push(question);
  }
  return { mode, questions, fromStudied: pool.some((k) => statuses.has(k)) };
});

async function build(
  mode: QuizMode,
  entry: KanjiEntry,
  pool: KanjiEntry[],
): Promise<Question | null> {
  const { kanji } = entry;
  const meaning = entry.heisig_en || entry.meanings.slice(0, 2).join(", ");
  const readingLine = [
    entry.on_readings.join("、"),
    entry.kun_readings.join("、"),
  ]
    .filter(Boolean)
    .join(" / ");

  if (mode === "stroke") {
    const alternates = entry.alternate_stroke_counts ?? [];
    return makeQuestion(
      {
        kanji,
        display: kanji,
        prompt: "How many strokes?",
        explain: `${kanji} has ${entry.stroke_count} strokes.${
          alternates.length
            ? ` ${alternates.join(" or ")} is a common miscount.`
            : ""
        }`,
      },
      String(entry.stroke_count),
      strokeOptions(entry.stroke_count, alternates)
        .filter((n) => n !== entry.stroke_count)
        .map(String),
    );
  }

  if (mode === "okurigana") {
    const kun = shuffle(entry.kun_readings).find(
      (r) => r.includes(".") && !r.includes("-"),
    );
    if (!kun) return null;
    const { full, correct, options } = okuriganaOptions(kanji, kun);
    return makeQuestion(
      {
        kanji,
        display: full,
        prompt: `Write this with ${kanji} (${meaning})`,
        explain: `${correct} is read ${full}. The kanji covers ${kun.split(".")[0]}, the kana ending ${kun.split(".")[1]} is written out.`,
      },
      correct,
      options,
    );
  }

  if (mode === "word") {
    const stems = readingStems(entry);
    const words = shuffle(await fetchCommonWords(kanji)).filter(
      (w) => [...w.written].length > 1,
    );
    for (const word of words) {
      const wrong = wordReadingOptions(word.pronounced, stems);
      if (!wrong?.length) continue;
      return makeQuestion(
        {
          kanji,
          display: word.written,
          prompt: `How is this word read? (${word.meaning})`,
          explain: `${word.written} is read ${word.pronounced}. ${kanji}: ${readingLine}`,
        },
        word.pronounced,
        wrong,
      );
    }
    return null;
  }

  const sameReading = entry.on_readings[0]
    ? ((await fetchReading(entry.on_readings[0]))?.main_kanji ?? [])
    : [];
  // Readings shared with the target get filtered out below, so reading mode asks for spares.
  const others = distractorKanji(
    kanji,
    sameReading,
    pool,
    entry.stroke_count,
    mode === "reading" ? 6 : 3,
  );

  if (mode === "meaning") {
    return makeQuestion(
      {
        kanji,
        prompt: `Which kanji means “${meaning}”?`,
        explain: `${kanji} means ${entry.meanings.join(", ")}.`,
      },
      kanji,
      others,
    );
  }

  // reading: the primary on reading (or kun if there is none) against other kanji's readings of the same type.
  const useOn = entry.on_readings.length > 0;
  const correct = (useOn ? entry.on_readings : entry.kun_readings)[0];
  if (!correct) return null;
  const own = new Set([...entry.on_readings, ...entry.kun_readings]);
  const otherEntries = await Promise.all(others.map((k) => fetchKanjiEntry(k)));
  const wrong = otherEntries
    .flatMap((e) =>
      e ? (useOn ? e.on_readings : e.kun_readings).slice(0, 1) : [],
    )
    .filter((r) => !own.has(r));
  return makeQuestion(
    {
      kanji,
      display: kanji,
      prompt: "Which is its main reading?",
      explain: `${kanji}: ${readingLine}`,
    },
    correct,
    wrong,
  );
}
