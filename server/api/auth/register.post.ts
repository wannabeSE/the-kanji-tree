export default defineEventHandler(async (event) => {
  const { email, password, tz } = await readCredentials(event);

  if (await dbGet("SELECT id FROM users WHERE email = ?", email))
    throw createError({
      statusCode: 409,
      statusMessage: "That email already has an account",
    });

  const passwordHash = await hashPassword(password);
  const { lastInsertRowid } = await dbRun(
    "INSERT INTO users (email, password_hash, tz, created_at) VALUES (?, ?, ?, ?)",
    email,
    passwordHash,
    tz,
    Date.now(),
  );

  const user = { id: Number(lastInsertRowid), email };
  await setUserSession(event, { user });
  return { user };
});
