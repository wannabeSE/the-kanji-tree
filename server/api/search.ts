/**
 * Filtering & query endpoint.
 * Query params: q (text), minStrokes, maxStrokes, component
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const minStrokes = query.minStrokes != null ? Number(query.minStrokes) : null;
  const maxStrokes = query.maxStrokes != null ? Number(query.maxStrokes) : null;
  const component =
    typeof query.component === "string" ? query.component : null;

  let hits = searchKanjiGraph(q);

  if (component) {
    hits = (q ? hits : searchKanjiGraph(component)).filter((kanji) => {
      const { parents, children } = getKanjiGraph(kanji);
      return (
        kanji === component ||
        parents.includes(component) ||
        children.includes(component)
      );
    });
  }

  let results = hits.map((kanji) => {
    const { parents, children } = getKanjiGraph(kanji);
    return { kanji, parents, children };
  });

  if (q && !results.length) {
    try {
      const remote = await searchKanji(q);
      results = remote.map((kanji) => ({
        kanji,
        ...getKanjiGraph(kanji),
      }));
    } catch {
      results = [];
    }
  }

  return {
    query: { q, minStrokes, maxStrokes, component },
    count: results.length,
    results,
  };
});
