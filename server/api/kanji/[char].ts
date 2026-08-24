export default defineEventHandler(async (event) => {
  const char = getRouterParam(event, "char");
  if (!char)
    throw createError({ statusCode: 400, statusMessage: "Missing character" });

  const decoded = decodeURIComponent(char);
  const storage = useStorage("cache");
  const cacheKey = `kanji:v4:${decoded}`;

  if (await storage.hasItem(cacheKey)) {
    return await storage.getItem(cacheKey);
  }

  const apiData = await $fetch(
    `https://kanjiapi.dev/v1/kanji/${encodeURIComponent(decoded)}`,
  ).catch(() => null);

  if (!apiData)
    throw createError({ statusCode: 404, statusMessage: "Kanji not found" });

  const node = getKanjiGraph(decoded);
  const { fromParents, toChildren } = getTransforms(decoded);

  const payload = {
    ...apiData,
    ids: node.ids ?? null,
    parents: node.parents,
    children: node.children,
    fromParents,
    toChildren,
  };

  await storage.setItem(cacheKey, payload, { ttl: 86400 });

  return payload;
});
