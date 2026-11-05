export default defineEventHandler(async (event) => {
  const { email, password } = await readCredentials(event);

  const row = dbGet<{ id: number; email: string; password_hash: string }>(
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    email,
  );
  if (!row || !(await verifyPassword(row.password_hash, password)))
    throw createError({
      statusCode: 401,
      statusMessage: "Wrong email or password",
    });

  const user = { id: row.id, email: row.email };
  await setUserSession(event, { user });
  return { user };
});
