export default defineEventHandler(async (event) => {
  const char = getRouterParam(event, "char");
  if (!char)
    throw createError({ statusCode: 400, statusMessage: "Missing character" });

  const decoded = decodeURIComponent(char);
  const storage = useStorage("cache");
  const cacheKey = `kanji-progression:${decoded}`;

  if (await storage.hasItem(cacheKey)) {
    return await storage.getItem(cacheKey);
  }

  const metadata = await $fetch(
    `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(decoded)}`,
  ).catch(() => null);

  if (!metadata)
    throw createError({ statusCode: 404, statusMessage: "Kanji not found" });

  const hexUnicode = decoded.codePointAt(0)!.toString(16).padStart(5, "0");
  const svg = await $fetch<string>(
    `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hexUnicode}.svg`,
    { responseType: "text" },
  ).catch(() => null);

  const { parents, children } = getKanjiGraph(decoded);

  const payload = {
    character: decoded,
    metadata,
    graph: { parents, children },
    svg,
  };

  await storage.setItem(cacheKey, payload, { ttl: 86400 });

  return payload;
});
