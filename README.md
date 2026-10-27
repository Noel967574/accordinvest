# Investment platform site (frontend + backend)

Full-stack marketing site: React frontend, Express + SQLite backend, and an in-browser
content editor so every word on the site can be changed without touching code.

## Run

```bash
npm install
npm run dev        # API on :5174, site on :5180
```

The client uses port **5180** with `strictPort`, because another dev server on this
machine already answers on `127.0.0.1:5173`. Override with `CLIENT_PORT=xxxx`.

Production:

```bash
npm run build      # outputs client/dist, served by the API
npm run start      # http://localhost:5174
```

## Layout

```
server/src/index.js          route mounting, public content + contact API
server/src/routes/           auth, account and admin endpoint groups
server/src/db.js             SQLite schema (node:sqlite, no native deps)
server/src/auth.js           scrypt passwords, cookie sessions, CSRF, reset tokens
server/src/util.js           rate limiting and money parsing (integer cents)
server/src/content.seed.js   initial placeholder copy
server/src/plans.seed.js     starter investment plans
client/src/auth-store.jsx    session restore, login/logout, RequireAuth guard
client/src/content-store.jsx CMS content provider
client/src/pages/            public pages, auth pages, AdminConsole
client/src/pages/dashboard/  client area
client/src/styles.css        all styling
server/data/site.db          created on first run
```

## Editing content

Open `/admin`, sign in, pick a section tab, change the text, Save. Public pages update
immediately. Add/remove repeatable items (features, plans, FAQ entries, testimonials)
with the Add item / Remove buttons. Brand name, colours, email, phone and address live
under **Branding & contact**.

Default admin: `admin@example.com` / `changeme`. Override before the first run:

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD=a-long-random-secret npm run dev
```

Also set `APP_SECRET` to a long random string in production — it signs session tokens.
Without it, a random secret is generated once and kept in `server/data/.session-secret`
so logins survive restarts.

## Limits and page metadata

`/api/contact` and `/api/newsletter` allow 5 requests per minute per IP; `/api/login` and
`/api/register` allow 10 per 5 minutes. Over the limit returns 429 with a `Retry-After`
header. Limits are in-memory and reset on restart — put a real limiter or gateway in front
if you expect abuse.

`client/src/components/Seo.jsx` sets the title, description, OpenGraph and robots tags per
page from CMS content. `/admin` and `/login` are marked `noindex`. Because the site is
client-rendered, crawlers that don't run JavaScript still see only the placeholder head
tags — add prerendering or SSR if search traffic matters.

## API

### Auth

Sessions are httpOnly signed cookies backed by a `sessions` table, so signing out
revokes server-side rather than just clearing browser storage.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/session` | current user + CSRF token |
| POST | `/api/auth/register` | create account, optional referral code |
| POST | `/api/auth/login` | `remember` extends to 30 days |
| POST | `/api/auth/logout` | revoke this session |
| POST | `/api/auth/forgot-password` | issue reset link (always reports ok) |
| POST | `/api/auth/reset-password` | consume token, drops all sessions |
| POST | `/api/auth/change-password` | requires current password |
| PATCH | `/api/auth/profile` | update display name |

Every state-changing call needs the `x-csrf-token` header matching the readable `csrf`
cookie; mismatches return 403. Passwords need 8+ characters with a letter and a number.

### Client account (`/api/account`, sign-in required)

`GET /summary` · `GET /transactions?type=` · `POST /deposit` · `POST /withdraw` ·
`POST /invest` · `POST /pay-plan` · `GET /referral`

Money is stored as integer cents. Deposits and withdrawals sit as `pending` until an
admin reviews them; pending withdrawals are excluded from the available balance so funds
cannot be double-spent. Investments settle automatically at maturity, crediting principal
plus return.

**Paying for a plan.** `POST /pay-plan` takes
`{ planId, amount, method: 'card' | 'crypto' | 'bank', reference?, card? }` and is the
checkout behind **Investment plans → Pay for this plan**:

- `card` — simulated processor. Validates the number (Luhn), expiry and CVC; card
  `4000 0000 0000 0002` is always declined so the failure path can be tested. A valid
  card credits the balance, writes an approved `deposit` row (reference `Card •••• 1234`)
  and opens the investment immediately.
- `crypto` — shows the admin-configured wallet (CMS → *Payment details*), requires the
  transaction hash, and raises a `pending` plan-linked deposit.
- `bank` — shows the admin-configured bank details, takes an optional transfer
  reference, and raises a `pending` plan-linked deposit.
- `app` — third-party payment apps (Paystack, Flutterwave, …) configured in
  CMS → *Payment details* → *paymentApps*. Send `app: '<name>'`; the app must be in
  the configured list and the payment reference is required. Raises a `pending`
  plan-linked deposit recorded under the app's name.

Approving a plan-linked deposit in the admin console automatically opens the plan it
paid for (the deposit is credited, then invested, so the balance nets out). The admin
Requests table shows which plan each payment was for.

### Admin (`/api/admin`, admin role required)

`GET /transactions?status=` · `POST /transactions/:id/review` · `GET /users` ·
`PATCH /users/:id` · `POST /users/:id/adjust` · `GET|POST|PUT|DELETE /plans` ·
`PUT /content/:key` · `GET /submissions`

Approving a referred account's first deposit pays the referrer `REFERRAL_BONUS_PCT`
(default 5%) once. Plans with live investments cannot be deleted, only deactivated.

**Manual adjustments.** `POST /users/:id/adjust` takes
`{ amount, direction: 'credit' | 'debit', reason, category }`. `category` is one of
`balance` (default), `returns`, `bonus`, `referral`, `deposit`, `withdrawal` — it says
which figure the entry also counts toward:

| category | moves in the client summary |
| --- | --- |
| `balance` | Available balance only |
| `returns` | Returns earned |
| `bonus` | Bonuses |
| `referral` | Referral rewards |
| `deposit` | Total deposited |
| `withdrawal` | Total withdrawn |

The reason is required, a debit that would push the balance below zero is refused, the
amount is capped at $1,000,000 per adjustment, and admins cannot debit their own
account. Every adjustment writes a signed ledger row of type `adjustment` (with the
`category` recorded alongside), so a debit is negative and always appears in the
client's own history as an adjustment with the reason attached. In the admin console
this is the **Adjust** button on each row of the Accounts tab; the form's
*Adjustment* selector picks the category.

## Pages

Public: `/` `/faq` `/login` `/register` `/forgot-password` `/reset-password`
Client: `/dashboard` `/dashboard/plans` `/money` `/transactions` `/referrals` `/settings`
Admin: `/admin` (requests, accounts, plans, website content, messages)

Unauthenticated visits to a protected route redirect to `/login?next=…` and return there
after sign-in.

## Notes

- Content ships as clearly-marked placeholders. Replace it with your own wording through
  `/admin`; nothing needs a code change.
- Images are CSS-drawn shapes. Drop real files into `client/public/` and reference them in
  `styles.css` / the section components.
- Database is a single file at `server/data/site.db` — back it up by copying it.
