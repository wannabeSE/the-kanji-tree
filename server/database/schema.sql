-- Applied on every server start; keep every statement idempotent.
-- Timestamps are epoch milliseconds. Intervals are days (fractions allowed).
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  daily_new_limit INTEGER NOT NULL DEFAULT 10,
  target_jlpt INTEGER,
  tz TEXT NOT NULL DEFAULT 'UTC',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS srs_items (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kanji TEXT NOT NULL,
  facet TEXT NOT NULL CHECK (facet IN ('meaning', 'reading')),
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due_at INTEGER NOT NULL,
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, kanji, facet)
);
CREATE INDEX IF NOT EXISTS srs_items_due ON srs_items (user_id, suspended, due_at);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kanji TEXT NOT NULL,
  facet TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 4),
  prev_interval REAL NOT NULL,
  new_interval REAL NOT NULL,
  duration_ms INTEGER,
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS reviews_user_time ON reviews (user_id, reviewed_at);

CREATE TABLE IF NOT EXISTS notes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kanji TEXT NOT NULL,
  mnemonic TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, kanji)
);
