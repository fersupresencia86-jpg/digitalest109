const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'sala_digitales.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  area          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member', -- 'member' | 'admin'
  must_change_password INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activities (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  activity_date TEXT NOT NULL,   -- YYYY-MM-DD, dia real de la actividad
  week_start    TEXT NOT NULL,   -- YYYY-MM-DD, lunes de esa semana
  photo_path    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id   INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  file_path     TEXT NOT NULL,
  original_name TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activities_week ON activities(week_start);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
`);

module.exports = db;
