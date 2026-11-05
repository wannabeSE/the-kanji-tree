import type { DatabaseSync, SQLInputValue } from "node:sqlite";

/**
 * The raw node:sqlite handle behind Nitro's `useDatabase()`.
 * Its calls are synchronous, so a multi-statement write can't interleave
 * with another request between statements.
 * db0 types getInstance() as possibly async; the node-sqlite connector returns it directly.
 */
export function db(): DatabaseSync {
  return useDatabase().getInstance() as unknown as DatabaseSync;
}

export function dbAll<T>(sql: string, ...params: SQLInputValue[]): T[] {
  return db()
    .prepare(sql)
    .all(...params) as T[];
}

export function dbGet<T>(
  sql: string,
  ...params: SQLInputValue[]
): T | undefined {
  return db()
    .prepare(sql)
    .get(...params) as T | undefined;
}

export function dbRun(sql: string, ...params: SQLInputValue[]) {
  return db()
    .prepare(sql)
    .run(...params);
}

export function tx<T>(fn: () => T): T {
  const handle = db();
  handle.exec("BEGIN");
  try {
    const result = fn();
    handle.exec("COMMIT");
    return result;
  } catch (error) {
    handle.exec("ROLLBACK");
    throw error;
  }
}
