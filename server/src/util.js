const hits = new Map();

export function rateLimit({ windowMs = 60_000, max = 5, name = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    const key = `${name}:${req.ip}`;
    const entry = hits.get(key);
    if (!entry || now > entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests — please try again shortly.' });
    }
    entry.count += 1;
    next();
  };
}

export const authLimit = rateLimit({ name: 'auth', max: 10, windowMs: 5 * 60_000 });
export const submitLimit = rateLimit({ name: 'submit', max: 5, windowMs: 60_000 });

/** Parse a user-entered money amount into integer cents. */
export function toCents(input) {
  const n = Number(String(input).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export const toAmount = (cents) => (Number(cents) / 100).toFixed(2);

export const money = (cents) => `$${toAmount(cents)}`;
