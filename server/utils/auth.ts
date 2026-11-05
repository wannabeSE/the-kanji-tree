import type { H3Event } from "h3";

export function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function readCredentials(event: H3Event) {
  const body = await readBody<Record<string, unknown> | null>(event);
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw createError({
      statusCode: 400,
      statusMessage: "Enter a valid email address",
    });
  if (password.length < 8 || password.length > 200)
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be 8 to 200 characters",
    });
  return { email, password, tz: isTimeZone(body?.tz) ? body.tz : "UTC" };
}

/** Set by server/middleware/me.ts for every /api/me/** request. */
export function meId(event: H3Event): number {
  const id = event.context.userId;
  if (typeof id !== "number")
    throw createError({ statusCode: 401, statusMessage: "Log in first" });
  return id;
}
