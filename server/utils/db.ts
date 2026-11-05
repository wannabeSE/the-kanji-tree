import { AsyncLocalStorage } from "node:async_hooks";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  createClient,
  type Client,
  type InValue,
  type Transaction,
} from "@libsql/client";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

type Store = { kind: "local" } | { kind: "remote"; tx: Transaction };

const context = new AsyncLocalStorage<Store>();
let file: DatabaseSync | undefined;
let client: Client | undefined;
let localQueue: Promise<unknown> = Promise.resolve();

function remoteEnabled() {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

function remote(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  client ??= createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return client;
}

function local(): DatabaseSync {
  if (process.env.VERCEL)
    throw new Error("TURSO_DATABASE_URL is required on Vercel");
  if (!file) {
    const path = resolve(".data/db.sqlite");
    mkdirSync(dirname(path), { recursive: true });
    file = new DatabaseSync(path);
  }
  return file;
}

/** Local queries share one connection, so they run one at a time. */
function withLocal<T>(fn: () => T): Promise<T> {
  if (context.getStore()?.kind === "local") return Promise.resolve(fn());
  const run = localQueue.then(fn, fn);
  localQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function cells(row: object): Record<string, unknown> {
  const named = row as { columns?: readonly string[] } & Record<
    string,
    unknown
  >;
  const keys = named.columns ?? Object.keys(named);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const value = named[key];
    out[key] = typeof value === "bigint" ? Number(value) : value;
  }
  return out;
}

function args(params: SQLInputValue[]): InValue[] {
  return params.map((value) =>
    typeof value === "boolean" ? Number(value) : value,
  ) as InValue[];
}

async function remoteExec(sql: string, params: SQLInputValue[]) {
  const active = context.getStore();
  const handle = active?.kind === "remote" ? active.tx : remote();
  return handle.execute({ sql, args: args(params) });
}

/** Splits a script. Remote Turso rejects the journal and foreign-key pragmas. */
export function sqlStatements(sql: string, remoteDb: boolean): string[] {
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return stripped
    .split(";")
    .map((part) => part.trim())
    .filter(
      (part) => part.length > 0 && !(remoteDb && part.startsWith("PRAGMA")),
    );
}

export async function migrate(sql: string) {
  if (remoteEnabled()) {
    for (const statement of sqlStatements(sql, true)) await dbRun(statement);
    return;
  }
  await withLocal(() => local().exec(sql));
}

export async function dbAll<T>(
  sql: string,
  ...params: SQLInputValue[]
): Promise<T[]> {
  if (remoteEnabled() || context.getStore()?.kind === "remote") {
    const result = await remoteExec(sql, params);
    return result.rows.map((row) => cells(row) as T);
  }
  return withLocal(() =>
    (
      local()
        .prepare(sql)
        .all(...params) as object[]
    ).map((row) => cells(row) as T),
  );
}

export async function dbGet<T>(
  sql: string,
  ...params: SQLInputValue[]
): Promise<T | undefined> {
  const rows = await dbAll<T>(sql, ...params);
  return rows[0];
}

export async function dbRun(sql: string, ...params: SQLInputValue[]) {
  if (remoteEnabled() || context.getStore()?.kind === "remote") {
    const result = await remoteExec(sql, params);
    return {
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
      changes: result.rowsAffected,
    };
  }
  return withLocal(() => {
    const result = local()
      .prepare(sql)
      .run(...params);
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes,
    };
  });
}

export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  if (remoteEnabled()) {
    // ponytail: one interactive transaction per call; a batch would be fewer
    // round trips, but some callers read a row and then decide the next write.
    const transaction = await remote().transaction("write");
    try {
      const result = await context.run({ kind: "remote", tx: transaction }, fn);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  return withLocal(async () => {
    const db = local();
    db.exec("BEGIN");
    try {
      const result = await context.run({ kind: "local" }, fn);
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}
