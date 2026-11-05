export default defineEventHandler(async (event) => {
  const userId = meId(event);
  const body = await readBody<Record<string, unknown> | null>(event);
  const current = userSettings(userId);

  const limit =
    body?.daily_new_limit === undefined
      ? current.daily_new_limit
      : Number(body.daily_new_limit);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100)
    throw createError({
      statusCode: 400,
      statusMessage: "Daily new cards must be 0 to 100",
    });

  const target =
    body?.target_jlpt === undefined ? current.target_jlpt : body.target_jlpt;
  if (target !== null && ![1, 2, 3, 4, 5].includes(target as number))
    throw createError({
      statusCode: 400,
      statusMessage: "Target must be N1 to N5 or none",
    });

  const tz = body?.tz === undefined ? current.tz : body.tz;
  if (!isTimeZone(tz))
    throw createError({ statusCode: 400, statusMessage: "Unknown time zone" });

  dbRun(
    "UPDATE users SET daily_new_limit = ?, target_jlpt = ?, tz = ? WHERE id = ?",
    limit,
    target as number | null,
    tz,
    userId,
  );
  return userSettings(userId);
});
