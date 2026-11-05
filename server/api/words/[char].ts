export default defineEventHandler(async (event) => {
  const char = decodeURIComponent(getRouterParam(event, "char") ?? "");
  if ([...char].length !== 1)
    throw createError({ statusCode: 400, statusMessage: "Invalid character" });

  return { kanji: char, words: await fetchCommonWords(char) };
});
