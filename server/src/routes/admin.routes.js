import { Router } from 'express';
import { db, getContent, setContent } from '../db.js';
import { requireAdmin } from '../auth.js';
import { awardReferralBonus, openInvestment } from './account.routes.js';
import { toCents } from '../util.js';

const router = Router();
router.use(requireAdmin);

const TX_COLUMNS =
  't.id, t.user_id, t.type, t.amount_cents, t.status, t.method, t.reference, t.note, t.admin_note, t.created_at, t.reviewed_at, u.email, u.name, p.name AS plan_name';

function pendingQuery(where = '', params = []) {
  return db
    .prepare(
      `SELECT ${TX_COLUMNS} FROM transactions t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN plans p ON p.id = t.plan_id ${where}
       ORDER BY t.id DESC LIMIT 300`
    )
    .all(...params);
}

router.get('/transactions', (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
  res.json(status ? pendingQuery('WHERE t.status = ?', [status]) : pendingQuery());
});

router.post('/transactions/:id/review', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(Number(req.params.id));
  if (!tx) return res.status(404).json({ error: 'Transaction not found.' });
  if (tx.status !== 'pending') return res.status(409).json({ error: 'That request has already been reviewed.' });

  const decision = req.body.decision;
  if (!['approved', 'rejected'].includes(decision))
    return res.status(400).json({ error: 'Choose to approve or reject.' });
  let note = String(req.body.note || '').trim().slice(0, 500);

  if (decision === 'approved') {
    if (tx.type === 'deposit') {
      db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(tx.amount_cents, tx.user_id);
      awardReferralBonus(tx.user_id, tx.amount_cents);
      // Deposits raised from the plan checkout start the plan they paid for.
      if (tx.plan_id) {
        const opened = openInvestment(tx.user_id, tx.plan_id, tx.amount_cents);
        if (opened.error) {
          const extra = `${opened.error} The amount was credited to the balance instead.`;
          note = note ? `${note} — ${extra}` : extra;
        }
      }
    } else if (tx.type === 'withdrawal') {
      const user = db.prepare('SELECT balance_cents FROM users WHERE id = ?').get(tx.user_id);
      if (tx.amount_cents > user.balance_cents)
        return res.status(409).json({ error: 'Balance is now too low to pay out this withdrawal.' });
      db.prepare('UPDATE users SET balance_cents = balance_cents - ? WHERE id = ?').run(tx.amount_cents, tx.user_id);
    } else {
      return res.status(400).json({ error: 'Only deposit and withdrawal requests need review.' });
    }
  }

  db.prepare("UPDATE transactions SET status = ?, admin_note = ?, reviewed_at = datetime('now') WHERE id = ?").run(
    decision,
    note,
    tx.id
  );
  res.json({ ok: true });
});

router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.balance_cents, u.referral_code, u.referred_by, u.kyc_status, u.created_at,
        (SELECT COALESCE(SUM(amount_cents),0) FROM transactions WHERE user_id = u.id AND status = 'approved'
          AND (type = 'deposit' OR (type = 'adjustment' AND category = 'deposit'))) AS deposited,
        (SELECT COUNT(*) FROM investments WHERE user_id = u.id AND status = 'active') AS active_plans
       FROM users u ORDER BY u.id DESC LIMIT 300`
    )
    .all();
  res.json(rows);
});

const MAX_ADJUSTMENT_CENTS = 100_000_000; // $1,000,000 per single adjustment

/**
 * Every manual entry is ledger type 'adjustment' with a category saying which
 * summary figure it also counts toward, so the client's totals and their
 * transaction history always agree.
 */
const ADJUSTMENT_CATEGORIES = {
  balance: { note: 'Balance adjustment' },
  returns: { note: 'Returns adjustment' },
  bonus: { note: 'Bonus adjustment' },
  referral: { note: 'Referral reward adjustment' },
  deposit: { note: 'Deposit adjustment' },
  withdrawal: { note: 'Withdrawal adjustment' }
};

/**
 * Manual credit or debit. Every adjustment writes a ledger row, so the change shows up
 * in the client's own history with the reason attached.
 */
router.post('/users/:id/adjust', (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT id, balance_cents FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  if (id === req.user.id && req.body.direction === 'debit')
    return res.status(400).json({ error: 'You cannot debit your own administrator account.' });

  const category = ADJUSTMENT_CATEGORIES[req.body.category] ? req.body.category : 'balance';
  const magnitude = toCents(req.body.amount);
  if (!magnitude) return res.status(400).json({ error: 'Enter an amount greater than zero.' });
  if (magnitude > MAX_ADJUSTMENT_CENTS) return res.status(400).json({ error: 'That adjustment is too large.' });

  const direction = req.body.direction === 'debit' ? 'debit' : 'credit';
  const delta = direction === 'debit' ? -magnitude : magnitude;
  if (user.balance_cents + delta < 0)
    return res.status(400).json({ error: 'That would take the balance below zero.' });

  const reason = String(req.body.reason || '').trim().slice(0, 300);
  if (reason.length < 3) return res.status(400).json({ error: 'Record a reason for this adjustment.' });

  const mapped = ADJUSTMENT_CATEGORIES[category];
  db.prepare('UPDATE users SET balance_cents = balance_cents + ? WHERE id = ?').run(delta, id);
  db.prepare(
    `INSERT INTO transactions (user_id, type, amount_cents, status, method, note, admin_note, category, reviewed_at)
     VALUES (?, 'adjustment', ?, 'approved', 'Manual entry', ?, ?, ?, datetime('now'))`
  ).run(id, delta, mapped.note, reason, category);

  res.json({ ok: true, category, balanceCents: user.balance_cents + delta });
});

router.patch('/users/:id', (req, res) => {
  const id = Number(req.params.id);
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!target) return res.status(404).json({ error: 'Account not found.' });
  if (req.body.role) {
    if (!['user', 'admin'].includes(req.body.role)) return res.status(400).json({ error: 'Unknown role.' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(req.body.role, id);
  }
  if (req.body.kycStatus) {
    if (!['unverified', 'pending', 'verified', 'rejected'].includes(req.body.kycStatus))
      return res.status(400).json({ error: 'Unknown verification state.' });
    db.prepare('UPDATE users SET kyc_status = ? WHERE id = ?').run(req.body.kycStatus, id);
  }
  res.json({ ok: true });
});

/* ---- plans ---- */

const shapePlan = (row) => ({
  id: row.id,
  name: row.name,
  minAmount: row.min_cents / 100,
  maxAmount: row.max_cents / 100,
  roiPct: row.roi_pct,
  termDays: row.term_days,
  payout: row.payout,
  description: row.description,
  active: Boolean(row.active),
  sort: row.sort
});

router.get('/plans', (_req, res) => res.json(db.prepare('SELECT * FROM plans ORDER BY sort, id').all().map(shapePlan)));

function validatePlan(body) {
  const name = String(body.name || '').trim().slice(0, 60);
  if (!name) return { error: 'Give the plan a name.' };
  const min = toCents(body.minAmount ?? 0) ?? 0;
  const max = body.maxAmount ? toCents(body.maxAmount) ?? 0 : 0;
  const roi = Number(body.roiPct);
  const term = Number(body.termDays);
  if (!Number.isFinite(roi) || roi < 0 || roi > 1000) return { error: 'Return must be between 0 and 1000 percent.' };
  if (!Number.isInteger(term) || term < 1 || term > 3650) return { error: 'Term must be between 1 and 3650 days.' };
  if (max && max < min) return { error: 'Maximum cannot be below the minimum.' };
  return {
    value: {
      name,
      min_cents: min,
      max_cents: max,
      roi_pct: roi,
      term_days: term,
      payout: ['at_maturity', 'weekly', 'monthly'].includes(body.payout) ? body.payout : 'at_maturity',
      description: String(body.description || '').trim().slice(0, 500),
      active: body.active === false ? 0 : 1,
      sort: Number(body.sort) || 0
    }
  };
}

router.post('/plans', (req, res) => {
  const { error, value } = validatePlan(req.body);
  if (error) return res.status(400).json({ error });
  const info = db
    .prepare(
      'INSERT INTO plans (name, min_cents, max_cents, roi_pct, term_days, payout, description, active, sort) VALUES (?,?,?,?,?,?,?,?,?)'
    )
    .run(value.name, value.min_cents, value.max_cents, value.roi_pct, value.term_days, value.payout, value.description, value.active, value.sort);
  res.status(201).json(shapePlan(db.prepare('SELECT * FROM plans WHERE id = ?').get(info.lastInsertRowid)));
});

router.put('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare('SELECT id FROM plans WHERE id = ?').get(id)) return res.status(404).json({ error: 'Plan not found.' });
  const { error, value } = validatePlan(req.body);
  if (error) return res.status(400).json({ error });
  db.prepare(
    'UPDATE plans SET name=?, min_cents=?, max_cents=?, roi_pct=?, term_days=?, payout=?, description=?, active=?, sort=? WHERE id=?'
  ).run(value.name, value.min_cents, value.max_cents, value.roi_pct, value.term_days, value.payout, value.description, value.active, value.sort, id);
  res.json(shapePlan(db.prepare('SELECT * FROM plans WHERE id = ?').get(id)));
});

router.delete('/plans/:id', (req, res) => {
  const id = Number(req.params.id);
  const inUse = db.prepare("SELECT COUNT(*) AS n FROM investments WHERE plan_id = ? AND status = 'active'").get(id).n;
  if (inUse) return res.status(409).json({ error: 'This plan has active investments — deactivate it instead.' });
  db.prepare('UPDATE plans SET active = 0 WHERE id = ?').run(id);
  res.json({ ok: true, deactivated: true });
});

/* ---- content + submissions reuse ---- */

router.put('/content/:key', (req, res) => {
  if (!getContent(req.params.key)) return res.status(404).json({ error: 'Unknown section' });
  setContent(req.params.key, req.body);
  res.json(getContent(req.params.key));
});

router.get('/submissions', (req, res) => {
  const kind = ['contact', 'newsletter'].includes(req.query.kind) ? req.query.kind : null;
  const rows = kind
    ? db.prepare('SELECT * FROM submissions WHERE kind = ? ORDER BY id DESC LIMIT 200').all(kind)
    : db.prepare('SELECT * FROM submissions ORDER BY id DESC LIMIT 200').all();
  res.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
});

export default router;
