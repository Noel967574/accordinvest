import { db } from './db.js';

const sample = [
  { name: 'Starter', min_cents: 49900, max_cents: 50000, roi_pct: 50, term_days: 7, payout: 'at_maturity', description: 'Low-risk entry tier for new investors.', sort: 1 },
  { name: 'Basic', min_cents: 99900, max_cents: 100000, roi_pct: 50, term_days: 7, payout: 'at_maturity', description: 'Balanced plan for steady capital growth.', sort: 2 },
  { name: 'PRO', min_cents: 499900, max_cents: 500000, roi_pct: 50, term_days: 7, payout: 'at_maturity', description: 'High-value plan for serious investors.', sort: 3 }
];

export function seedPlans() {
  if (db.prepare('SELECT COUNT(*) AS n FROM plans').get().n > 0) return;
  const insert = db.prepare(
    'INSERT INTO plans (name, min_cents, max_cents, roi_pct, term_days, payout, description, active, sort) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  for (const p of sample) insert.run(p.name, p.min_cents, p.max_cents, p.roi_pct, p.term_days, p.payout, p.description, 1, p.sort);
}
