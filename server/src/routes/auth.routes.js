import { Router } from 'express';
import { db } from '../db.js';
import {
  SESSION_COOKIE,
  consumeReset,
  cookie,
  createReset,
  createUser,
  endSession,
  issueCsrf,
  passwordPolicy,
  publicUser,
  requireUser,
  setPassword,
  startSession,
  verifyUser
} from '../auth.js';
import { authLimit } from '../util.js';

const router = Router();

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function establish(res, userRow, remember) {
  const session = startSession(userRow.id, remember);
  res.append('Set-Cookie', cookie(SESSION_COOKIE, session.value, { maxAgeMs: session.maxAgeMs }));
  return issueCsrf(res);
}

router.get('/session', (req, res) => {
  const csrfToken = req.csrfToken || issueCsrf(res);
  res.json({ user: req.user, csrfToken });
});

router.post('/register', authLimit, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const referral = String(req.body.referral || '').trim().toUpperCase() || null;

  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const weak = passwordPolicy(password);
  if (weak) return res.status(400).json({ error: weak });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
    return res.status(409).json({ error: 'An account with that email already exists.' });

  if (referral && !db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral))
    return res.status(400).json({ error: 'That referral code is not recognised.' });

  const created = createUser({ email, name: String(req.body.name || '').trim(), password, referredBy: referral });
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(created.id);
  establish(res, row);
  res.status(201).json({ user: publicUser(row) });
});

router.post('/login', authLimit, (req, res) => {
  const user = verifyUser(String(req.body.email || '').trim(), String(req.body.password || ''));
  if (!user) return res.status(401).json({ error: 'Email or password is incorrect.' });
  establish(res, user, Boolean(req.body.remember));
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  endSession(req.cookies[SESSION_COOKIE]);
  res.append('Set-Cookie', cookie(SESSION_COOKIE, '', { maxAgeMs: 0 }));
  res.json({ ok: true });
});

router.post('/forgot-password', authLimit, (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  // Same response either way so the endpoint cannot confirm which addresses are registered.
  if (!user) return res.json({ ok: true });

  const token = createReset(user.id);
  const link = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
  const body = { ok: true };
  // No mail transport is configured, so expose the link for local testing only.
  if (!process.env.SMTP_HOST && process.env.NODE_ENV !== 'production') body.devResetLink = link;
  console.log(`Password reset link for ${email}: ${link}`);
  res.json(body);
});

router.post('/reset-password', authLimit, (req, res) => {
  const row = consumeReset(String(req.body.token || ''));
  if (!row) return res.status(400).json({ error: 'That reset link is invalid or has expired.' });
  const weak = passwordPolicy(String(req.body.password || ''));
  if (weak) return res.status(400).json({ error: weak });
  setPassword(row.user_id, String(req.body.password));
  res.json({ ok: true });
});

router.post('/change-password', requireUser, (req, res) => {
  const current = verifyUser(req.user.email, String(req.body.currentPassword || ''));
  if (!current) return res.status(400).json({ error: 'Current password is incorrect.' });
  const weak = passwordPolicy(String(req.body.password || ''));
  if (weak) return res.status(400).json({ error: weak });
  setPassword(req.user.id, String(req.body.password));
  res.json({ ok: true });
});

router.patch('/profile', requireUser, (req, res) => {
  db.prepare('UPDATE users SET name = COALESCE(?, name) WHERE id = ?').run(
    String(req.body.name || '').trim() || null,
    req.user.id
  );
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

export default router;
