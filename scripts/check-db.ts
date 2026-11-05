/**
 * Confirms the hosted database accepts the schema and a transaction.
 * Usage: npx tsx scripts/check-db.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq);
  const value = trimmed.slice(eq + 1).replace(/^["']|["']$/g, "");
  process.env[key] ??= value;
}

assert.ok(
  (process.env.NUXT_SESSION_PASSWORD?.length ?? 0) >= 32,
  "NUXT_SESSION_PASSWORD must be at least 32 characters",
);
assert.ok(
  process.env.TURSO_DATABASE_URL?.startsWith("libsql:"),
  "TURSO_DATABASE_URL must be a libsql:// URL",
);
assert.ok(process.env.TURSO_AUTH_TOKEN, "TURSO_AUTH_TOKEN is missing");

const { dbAll, dbGet, migrate, sqlStatements, tx } =
  await import("../server/utils/db");
const schema = readFileSync("server/database/schema.sql", "utf8");
const statements = sqlStatements(schema, true);
assert.equal(statements.length, 6);
assert.ok(statements.every((statement) => !statement.includes("PRAGMA")));

await migrate(schema);

const tables = await dbAll<{ name: string }>(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
);
assert.deepEqual(
  tables.map((table) => table.name),
  ["notes", "reviews", "srs_items", "users"],
);

const expected: Record<string, string[]> = {
  users: [
    "id",
    "email",
    "password_hash",
    "daily_new_limit",
    "target_jlpt",
    "tz",
    "created_at",
  ],
  srs_items: [
    "user_id",
    "kanji",
    "facet",
    "ease",
    "interval_days",
    "reps",
    "lapses",
    "due_at",
    "suspended",
    "created_at",
  ],
  reviews: [
    "id",
    "user_id",
    "kanji",
    "facet",
    "grade",
    "prev_interval",
    "new_interval",
    "duration_ms",
    "reviewed_at",
  ],
  notes: ["user_id", "kanji", "mnemonic", "updated_at"],
};
for (const [table, columns] of Object.entries(expected)) {
  const info = await dbAll<{ name: string }>(`PRAGMA table_info(${table})`);
  const names = new Set(info.map((column) => column.name));
  for (const column of columns)
    assert.ok(names.has(column), `${table}.${column} is missing`);
}

const probe = await tx(async () => dbGet<{ ok: number }>("SELECT 1 AS ok"));
assert.equal(probe?.ok, 1);

console.log(`turso ok: ${tables.map((table) => table.name).join(", ")}`);
