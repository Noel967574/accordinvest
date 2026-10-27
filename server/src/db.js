import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'site.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS content (
    key  TEXT PRIMARY KEY,
    body TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT NOT NULL,
    name       TEXT,
    email      TEXT,
    payload    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    name          TEXT,
    pass_hash     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user',
    balance_cents INTEGER NOT NULL DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by   TEXT,
    kyc_status    TEXT NOT NULL DEFAULT 'unverified',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    jti        TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    used_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    min_cents   INTEGER NOT NULL DEFAULT 0,
    max_cents   INTEGER NOT NULL DEFAULT 0,
    roi_pct     REAL NOT NULL DEFAULT 0,
    term_days   INTEGER NOT NULL DEFAULT 30,
    payout      TEXT NOT NULL DEFAULT 'at_maturity',
    description TEXT NOT NULL DEFAULT '',
    active      INTEGER NOT NULL DEFAULT 1,
    sort        INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS investments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id           INTEGER NOT NULL REFERENCES plans(id),
    principal_cents   INTEGER NOT NULL,
    started_at        TEXT NOT NULL DEFAULT (datetime('now')),
    matures_at        TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'active',
    payout_cents      INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    method      TEXT,
    reference   TEXT,
    note        TEXT,
    admin_note  TEXT,
    category    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  );
`);

// Manual admin adjustments are stored as type 'adjustment'; the category records
// which summary figure (returns, bonus, deposit…) the amount also counts toward.
const txCols = db.prepare('PRAGMA table_info(transactions)').all().map((c) => c.name);
if (!txCols.includes('category')) db.exec('ALTER TABLE transactions ADD COLUMN category TEXT');
// Deposits raised from the plan checkout carry the plan they pay for.
if (!txCols.includes('plan_id')) db.exec('ALTER TABLE transactions ADD COLUMN plan_id INTEGER REFERENCES plans(id)');

// Pre-existing databases won't have the newer user columns.
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('balance_cents')) {
  db.exec('ALTER TABLE users ADD COLUMN balance_cents INTEGER NOT NULL DEFAULT 0');
}
if (!userCols.includes('referral_code')) db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT');
if (!userCols.includes('referred_by')) db.exec('ALTER TABLE users ADD COLUMN referred_by TEXT');
if (!userCols.includes('kyc_status')) db.exec("ALTER TABLE users ADD COLUMN kyc_status TEXT DEFAULT 'unverified'");
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code)');

export function getContent(key) {
  const row = db.prepare('SELECT body FROM content WHERE key = ?').get(key);
  return row ? JSON.parse(row.body) : null;
}

export function setContent(key, body) {
  db.prepare(
    'INSERT INTO content (key, body) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET body = excluded.body'
  ).run(key, JSON.stringify(body));
}

export function allContent() {
  return Object.fromEntries(
    db.prepare('SELECT key, body FROM content').all().map((r) => [r.key, JSON.parse(r.body)])
  );
}

export const asOfCents = (cents) => (Number(cents) / 100).toFixed(2);
