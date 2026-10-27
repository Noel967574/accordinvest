import { Router } from 'express';
import { db, getContent } from '../db.js';
import { requireUser } from '../auth.js';
import { submitLimit, toCents, toAmount } from '../util.js';

const router = Router();
router.use(requireUser);

const REFERRAL_BONUS_PCT = Number(process.env.REFERRAL_BONUS_PCT || 5);

function totals(userId) {
  // Approved rows of the ledger type, plus manual adjustments filed under that
  // category (e.g. 'returns' adjustments count toward Returns earned).
  const sum = (type, category = null) =>
    db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS n FROM transactions
         WHERE user_id = ? AND status = 'approved'
           AND (type = ? OR (type = 'adjustment' AND category = ?))`
      )
      .get(userId, type, category).n;

  const pendingWithdrawal = db
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS n FROM transactions WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending'")
    .get(userId).n;

  const row = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(userId);
  return {
    balanceCents: row.balance_cents,
    availableCents: row.balance_cents - pendingWithdrawal,
    pendingWithdrawalCents: pendingWithdrawal,
    totalDepositCents: sum('deposit', 'deposit'),
    totalWithdrawalCents: sum('withdrawal', 'withdrawal'),
    totalProfitCents: sum('profit', 'returns'),
    bonusCents: sum('bonus', 'bonus'),
    referralBonusCents: sum('referral_bonus', 'referral')
  };
}

/** First funded deposit pays a one-off percentage bonus to the referring account. */
function awardReferralBonus(userId, depositCents) {
  const user = db.prepare('SELECT referred_by FROM users WHERE id = ?').get(userId);
  if (!user?.referred_by) return;

  const alreadyRewarded = db
    .prepare("SELECT COUNT(*) AS n FROM transactions WHERE user_id = ? AND type = 'referral_bonus'")
    .get(userId).n;
  if (alreadyRewarded) return;

  const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(user.referred_by);
  if (!referrer) return;

  const bonus = Math.round((depositCents * REFERRAL_BONUS_PCT) / 100);
  if (bonus <= 0) return;
  db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(bonus, referrer.id);
  db.prepare("INSERT INTO transactions (user_id, type, amount_cents, status, note) VALUES (?, 'referral_bonus', ?, 'approved', ?)").run(
    referrer.id,
    bonus,
    'Referral reward'
  );
}

/** Credit returns for investments whose term has elapsed. */
function settleMatured(userId) {
  const due = db
    .prepare("SELECT * FROM investments WHERE user_id = ? AND status = 'active' AND matures_at <= datetime('now')")
    .all(userId);
  for (const inv of due) {
    const plan = db.prepare('SELECT roi_pct FROM plans WHERE id = ?').get(inv.plan_id);
    const profit = Math.round((inv.principal_cents * (plan?.roi_pct ?? 0)) / 100);
    db.prepare("UPDATE investments SET status = 'settled', payout_cents = ? WHERE id = ?").run(
      inv.principal_cents + profit,
      inv.id
    );
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(
      inv.principal_cents + profit,
      userId
    );
    db.prepare('INSERT INTO transactions (user_id, type, amount_cents, status, note) VALUES (?, ?, ?, ?, ?)').run(
      userId,
      'profit',
      profit,
      'approved',
      `Return on ${inv.plan_id}`
    );
  }
  return due.length;
}

router.get('/summary', (req, res) => {
  settleMatured(req.user.id);
  const summaryTotals = totals(req.user.id);
  const active = db
    .prepare(
      `SELECT i.id, i.principal_cents, i.matures_at, i.started_at, p.name AS plan_name, p.roi_pct, p.term_days
       FROM investments i JOIN plans p ON p.id = i.plan_id
       WHERE i.user_id = ? AND i.status = 'active' ORDER BY i.matures_at`
    )
    .all(req.user.id);

  const recent = db
    .prepare('SELECT id, type, amount_cents, status, method, note, created_at FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 5')
    .all(req.user.id);

  res.json({
    user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role, kycStatus: req.user.kycStatus },
    totals: summaryTotals,
    activePlans: active,
    recentTransactions: recent
  });
});

router.get('/transactions', (req, res) => {
  settleMatured(req.user.id);
  const type = ['deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_bonus', 'adjustment'].includes(req.query.type)
    ? req.query.type
    : null;
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = type
    ? db.prepare('SELECT * FROM transactions WHERE user_id = ? AND type = ? ORDER BY id DESC LIMIT ?').all(req.user.id, type, limit)
    : db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(req.user.id, limit);
  res.json(rows);
});

router.post('/deposit', submitLimit, (req, res) => {
  const cents = toCents(req.body.amount);
  if (!cents || cents < 1000) return res.status(400).json({ error: 'Enter a deposit amount of at least $10.' });
  const method = String(req.body.method || '').trim();
  if (!method) return res.status(400).json({ error: 'Choose a payment method.' });
  const reference = String(req.body.reference || '').trim().slice(0, 200);
  const apps = Array.isArray(getContent('payment')?.paymentApps) ? getContent('payment').paymentApps : [];
  if (apps.some((a) => a && a.name === method) && reference.length < 4)
    return res.status(400).json({ error: 'Paste the payment reference shown in the app.' });

  db.prepare(
    "INSERT INTO transactions (user_id, type, amount_cents, status, method, reference) VALUES (?, 'deposit', ?, 'pending', ?, ?)"
  ).run(req.user.id, cents, method, reference || null);
  res.status(201).json({ ok: true, message: 'Deposit request submitted for review.' });
});

router.post('/withdraw', submitLimit, (req, res) => {
  const cents = toCents(req.body.amount);
  const { availableCents } = totals(req.user.id);
  if (!cents || cents < 1000) return res.status(400).json({ error: 'Enter a withdrawal amount of at least $10.' });
  if (cents > availableCents)
    return res.status(400).json({ error: 'That exceeds your available balance.' });

  db.prepare(
    "INSERT INTO transactions (user_id, type, amount_cents, status, method, reference) VALUES (?, 'withdrawal', ?, 'pending', ?, ?)"
  ).run(req.user.id, cents, String(req.body.method || '').trim(), String(req.body.reference || '').trim());
  res.status(201).json({ ok: true, message: 'Withdrawal request submitted for review.' });
});

/** Open an investment from available funds. Returns { error } or the investment. */
function openInvestment(userId, planId, amountCents) {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(Number(planId));
  if (!plan) return { error: 'That plan is not available.' };
  if (!amountCents) return { error: 'Enter an investment amount.' };
  if (amountCents < plan.min_cents) return { error: `${plan.name} starts at a larger amount.` };
  if (plan.max_cents && amountCents > plan.max_cents) return { error: 'That exceeds this plan maximum.' };

  const { availableCents } = totals(userId);
  if (amountCents > availableCents) return { error: 'Your available balance does not cover that amount.' };

  const maturesAt = new Date(Date.now() + plan.term_days * 86400_000).toISOString().slice(0, 19).replace('T', ' ');
  db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(amountCents, userId);
  const info = db
    .prepare('INSERT INTO investments (user_id, plan_id, principal_cents, matures_at) VALUES (?, ?, ?, ?)')
    .run(userId, plan.id, amountCents, maturesAt);
  db.prepare(
    "INSERT INTO transactions (user_id, type, amount_cents, status, note) VALUES (?, 'investment', ?, 'approved', ?)"
  ).run(userId, amountCents, plan.name);

  return { investmentId: info.lastInsertRowid, maturesAt, planName: plan.name };
}

router.post('/invest', submitLimit, (req, res) => {
  const cents = toCents(req.body.amount);
  const result = openInvestment(req.user.id, req.body.planId, cents);
  if (result.error) return res.status(result.error.includes('not available') ? 404 : 400).json({ error: result.error });
  res.status(201).json({ ok: true, ...result });
});

/* ---- pay for a plan directly ---- */

function luhnOk(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function cardError(card) {
  const number = String(card?.number || '').replace(/[\s-]/g, '');
  if (!/^\d{13,19}$/.test(number) || !luhnOk(number)) return 'That card number is not valid.';
  const m = String(card?.expiry || '').match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return 'Enter the expiry as MM/YY.';
  const month = Number(m[1]);
  if (month < 1 || month > 12) return 'That expiry month is not valid.';
  const endOfMonth = new Date(2000 + Number(m[2]), month, 1).getTime();
  if (endOfMonth < Date.now()) return 'That card has expired.';
  if (!/^\d{3,4}$/.test(String(card?.cvc || ''))) return 'Enter the 3-digit security code.';
  if (!String(card?.name || '').trim()) return 'Enter the name on the card.';
  return null;
}

/**
 * Pay for a chosen plan. Card payments clear instantly (simulated processor);
 * crypto and bank transfers raise a plan-linked deposit for admin confirmation.
 */
router.post('/pay-plan', submitLimit, (req, res) => {
  const cents = toCents(req.body.amount);
  const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND active = 1').get(Number(req.body.planId));
  if (!plan) return res.status(404).json({ error: 'That plan is not available.' });
  if (!cents || cents < plan.min_cents) return res.status(400).json({ error: `${plan.name} starts at ${toAmount(plan.min_cents)}.` });
  if (plan.max_cents && cents > plan.max_cents) return res.status(400).json({ error: 'That exceeds this plan maximum.' });

  const method = ['card', 'crypto', 'bank', 'app'].includes(req.body.method) ? req.body.method : null;
  if (!method) return res.status(400).json({ error: 'Choose a payment method.' });
  const reference = String(req.body.reference || '').trim().slice(0, 200);
  if (method === 'crypto' && reference.length < 8)
    return res.status(400).json({ error: 'Paste the transaction hash of your transfer.' });

  let methodLabel;
  if (method === 'crypto') methodLabel = 'Crypto';
  else if (method === 'bank') methodLabel = 'Bank transfer';
  else if (method === 'app') {
    const apps = Array.isArray(getContent('payment')?.paymentApps) ? getContent('payment').paymentApps : [];
    const app = apps.find((a) => a && a.name === req.body.app);
    if (!app) return res.status(400).json({ error: 'Choose one of the listed payment apps.' });
    if (reference.length < 4) return res.status(400).json({ error: 'Paste the payment reference from the app.' });
    methodLabel = app.name;
  }

  if (method === 'card') {
    const problem = cardError(req.body.card);
    if (problem) return res.status(402).json({ error: problem });
    const number = String(req.body.card.number).replace(/[\s-]/g, '');
    if (number === '4000000000000002')
      return res.status(402).json({ error: 'Card declined by the issuer. Try another card.' });

    db.prepare(
      `INSERT INTO transactions (user_id, type, amount_cents, status, method, reference, note, plan_id, reviewed_at)
       VALUES (?, 'deposit', ?, 'approved', 'Card', ?, ?, ?, datetime('now'))`
    ).run(req.user.id, cents, `Card •••• ${number.slice(-4)}`, `Payment for ${plan.name}`, plan.id);
    db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(cents, req.user.id);
    awardReferralBonus(req.user.id, cents);
    const paid = openInvestment(req.user.id, plan.id, cents);
    if (paid.error) return res.status(400).json({ error: paid.error });
    return res.status(201).json({ ok: true, paid: true, ...paid });
  }

  const info = db
    .prepare(
      `INSERT INTO transactions (user_id, type, amount_cents, status, method, reference, note, plan_id)
       VALUES (?, 'deposit', ?, 'pending', ?, ?, ?, ?)`
    )
    .run(req.user.id, cents, methodLabel, reference || null, `Payment for ${plan.name}`, plan.id);
  res.status(201).json({
    ok: true,
    paid: false,
    message: `Payment submitted — your ${plan.name} plan starts as soon as we confirm your ${method === 'crypto' ? 'transfer' : 'deposit'}.`,
    requestId: info.lastInsertRowid
  });
});

router.get('/referral', (req, res) => {
  const base = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const count = db.prepare('SELECT COUNT(*) AS n FROM users WHERE referred_by = ?').get(req.user.referralCode).n;
  res.json({
    code: req.user.referralCode,
    link: `${base}/register?ref=${req.user.referralCode}`,
    referredCount: count,
    earnedCents: db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS n FROM transactions
         WHERE user_id = ? AND status = 'approved'
           AND (type = 'referral_bonus' OR (type = 'adjustment' AND category = 'referral'))`
      )
      .get(req.user.id).n,
    bonusPct: REFERRAL_BONUS_PCT
  });
});

export { REFERRAL_BONUS_PCT, awardReferralBonus, openInvestment };
export default router;
