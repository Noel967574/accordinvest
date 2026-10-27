import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allContent, db, getContent, setContent } from './db.js';
import { seedContent } from './content.seed.js';
import { seedPlans } from './plans.seed.js';
import { attachUser, csrfGuard, ensureAdmin } from './auth.js';
import { submitLimit } from './util.js';
import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import adminRoutes from './routes/admin.routes.js';

const PORT = Number(process.env.PORT) || 5174;
const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(attachUser);

seedContent();
seedPlans();
const adminEmail = ensureAdmin();

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clean = (v, max = 4000) => String(v ?? '').trim().slice(0, max);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/content', (_req, res) => res.json(allContent()));
app.get('/api/content/:key', (req, res) => {
  const body = getContent(req.params.key);
  if (!body) return res.status(404).json({ error: 'Unknown section' });
  res.json(body);
});

app.get('/api/plans', (_req, res) => {
  const rows = db.prepare('SELECT * FROM plans WHERE active = 1 ORDER BY sort, id').all();
  res.json(
    rows.map((p) => ({
      id: p.id,
      name: p.name,
      minAmount: p.min_cents / 100,
      maxAmount: p.max_cents / 100,
      roiPct: p.roi_pct,
      termDays: p.term_days,
      payout: p.payout,
      description: p.description
    }))
  );
});

app.post('/api/contact', csrfGuard, submitLimit, (req, res) => {
  const name = clean(req.body.name, 200);
  const email = clean(req.body.email, 200);
  const message = clean(req.body.message, 5000);
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required.' });
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'That email address looks invalid.' });
  db.prepare('INSERT INTO submissions (kind, name, email, payload) VALUES (?, ?, ?, ?)').run(
    'contact',
    name,
    email,
    JSON.stringify({ message, topic: clean(req.body.topic, 100) })
  );
  res.status(201).json({ ok: true });
});

app.post('/api/newsletter', csrfGuard, submitLimit, (req, res) => {
  const email = clean(req.body.email, 200);
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  db.prepare('INSERT INTO submissions (kind, name, email, payload) VALUES (?, ?, ?, ?)').run(
    'newsletter',
    clean(req.body.name, 200) || null,
    email,
    '{}'
  );
  res.status(201).json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/account', csrfGuard, accountRoutes);
app.use('/api/admin', csrfGuard, adminRoutes);

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log(`Admin login: ${adminEmail} (set ADMIN_EMAIL / ADMIN_PASSWORD before first run)`);
});
