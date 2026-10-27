import { randomBytes, scryptSync, timingSafeEqual, createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dataDir, db } from './db.js';

function loadSecret() {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  const file = path.join(dataDir, '.session-secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

const SECRET = loadSecret();
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * (process.env.NODE_ENV === 'production' ? 7 : 30);
const REMEMBER_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const PROD = process.env.NODE_ENV === 'production';

export const SESSION_COOKIE = 'sid';
export const CSRF_COOKIE = 'csrf';

export function passwordPolicy(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 200) return 'Password is too long.';
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password))
    return 'Password must include at least one letter and one number.';
  return null;
}

function sign(value) {
  return createHmac('sha256', SECRET).update(value).digest('base64url');
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((p) => {
      const i = p.indexOf('=');
      return i === -1 ? [p.trim(), ''] : [p.slice(0, i).trim(), decodeURIComponent(p.slice(i + 1))];
    })
  );
}

function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeReferralCode() {
  return Array.from(randomBytes(6), (b) => codeAlphabet[b % codeAlphabet.length]).join('');
}

export function createUser({ email, name, password, role = 'user', referredBy = null }) {
  const salt = randomBytes(16).toString('hex');
  const info = db
    .prepare('INSERT INTO users (email, name, pass_hash, role, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(email.toLowerCase(), name ?? null, `${salt}$${hashPassword(password, salt)}`, role, makeReferralCode(), referredBy);
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid));
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    balanceCents: row.balance_cents,
    referralCode: row.referral_code,
    kycStatus: row.kyc_status,
    joinedAt: row.created_at
  };
}

export function verifyUser(email, password) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user) return null;
  const [salt, expected] = user.pass_hash.split('$');
  const actual = hashPassword(password, salt);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'))) return null;
  return user;
}

export function setPassword(userId, password) {
  const salt = randomBytes(16).toString('hex');
  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(`${salt}$${hashPassword(password, salt)}`, userId);
}

/* ---- sessions: random jti stored server-side, so logout actually revokes ---- */

export function startSession(userId, remember = false) {
  const jti = randomUUID();
  const ttl = remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
  const expiresAt = Date.now() + ttl;
  db.prepare('INSERT INTO sessions (jti, user_id, expires_at) VALUES (?, ?, ?)').run(jti, userId, expiresAt);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  const value = `${jti}.${expiresAt}.${remember ? 1 : 0}`;
  return { value: `${value}.${sign(value)}`, maxAgeMs: remember ? REMEMBER_TTL_MS : undefined };
}

export function sessionUser(cookieValue) {
  const parts = String(cookieValue || '').split('.');
  const sig = parts.pop();
  const value = parts.join('.');
  const [jti, expiresAt] = parts;
  if (!jti || !expiresAt || !sig) return null;
  const expected = sign(value);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  if (Number(expiresAt) < Date.now()) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.jti = ? AND s.expires_at > ?`
    )
    .get(jti, Date.now());
  return row ? publicUser(row) : null;
}

export function endSession(cookieValue) {
  const [jti] = String(cookieValue || '').split('.');
  if (jti) db.prepare('DELETE FROM sessions WHERE jti = ?').run(jti);
}

export function cookie(name, value, { maxAgeMs, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', httpOnly && 'HttpOnly'];
  if (PROD) parts.push('Secure');
  if (maxAgeMs) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  else if (maxAgeMs === 0) parts.push('Max-Age=0');
  return parts.filter(Boolean).join('; ');
}

/* ---- middleware ---- */

export function attachUser(req, _res, next) {
  req.cookies = parseCookies(req.headers.cookie);
  req.user = sessionUser(req.cookies[SESSION_COOKIE]);
  req.csrfToken = req.cookies[CSRF_COOKIE];
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  next();
}

// Double-submit CSRF: the readable cookie must match the header on state changes.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = req.get('x-csrf-token');
  if (!req.csrfToken || !sent || sent !== req.csrfToken) {
    return res.status(403).json({ error: 'Session security check failed. Reload the page.' });
  }
  next();
}

export function issueCsrf(res) {
  const token = randomBytes(16).toString('hex');
  res.append('Set-Cookie', cookie(CSRF_COOKIE, token, { httpOnly: false, maxAgeMs: SESSION_TTL_MS }));
  return token;
}

/* ---- password reset ---- */

export function createReset(userId) {
  const token = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)').run(
    token,
    userId,
    Date.now() + 1000 * 60 * 60
  );
  db.prepare('DELETE FROM password_resets WHERE expires_at < ?').run(Date.now());
  return token;
}

export function consumeReset(token) {
  const row = db.prepare('SELECT * FROM password_resets WHERE token = ?').get(String(token || ''));
  if (!row || row.used_at || row.expires_at < Date.now()) return null;
  db.prepare('UPDATE password_resets SET used_at = datetime(\'now\') WHERE token = ?').run(row.token);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
  return row;
}

export function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    if (existing.role !== 'admin') db.prepare('UPDATE users SET role = \'admin\' WHERE id = ?').run(existing.id);
    return email;
  }
  createUser({ email, name: 'Administrator', password: process.env.ADMIN_PASSWORD || 'changeme', role: 'admin' });
  return email;
}
