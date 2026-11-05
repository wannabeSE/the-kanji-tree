export default defineEventHandler(async (event) => {
  const char = getRouterParam(event, "char");
  if (!char)
    throw createError({ statusCode: 400, statusMessage: "Missing character" });

  const decoded = decodeURIComponent(char);
  if ([...decoded].length !== 1)
    throw createError({ statusCode: 400, statusMessage: "Invalid character" });

  const entry = await fetchKanjiEntry(decoded);
  if (!entry)
    throw createError({ statusCode: 404, statusMessage: "Kanji not found" });
  return entry;
});
