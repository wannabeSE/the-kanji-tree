declare module "h3" {
  interface H3EventContext {
    userId?: number;
  }
}

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith("/api/me/") && event.path !== "/api/me") return;

  const { user } = await requireUserSession(event);
  // A session can outlive its user row (e.g. a wiped dev database).
  if (!(await dbGet("SELECT id FROM users WHERE id = ?", user.id))) {
    await clearUserSession(event);
    throw createError({ statusCode: 401, statusMessage: "Log in first" });
  }
  event.context.userId = user.id;
});
