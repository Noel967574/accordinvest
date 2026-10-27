import { Fragment, useCallback, useEffect, useState } from 'react';
import { api, money } from '../api.js';
import Seo from '../components/Seo.jsx';
import ContentEditor from '../components/ContentEditor.jsx';
import { useAuth } from '../auth-store.jsx';

const emptyPlan = { name: '', minAmount: '', maxAmount: '', roiPct: '', termDays: 30, payout: 'at_maturity', description: '', active: true };
const ADMIN_SECTIONS = {
  requests: ['Transaction requests', 'Review deposit and withdrawal requests, and track their status.'],
  users: ['Account management', 'Review account details, verification, roles, and balance adjustments.'],
  plans: ['Investment plans', 'Manage the investment options available to clients.'],
  content: ['Website content', 'Update the copy and information displayed across the public site.'],
  inbox: ['Messages', 'Review questions and messages submitted by clients.']
};

function Requests() {
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    api.admin
      .transactions(status)
      .then((r) => {
        setRows(r);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [status]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  async function review(id, decision) {
    setNote('');
    try {
      await api.admin.review(id, { decision, note: '' });
      setNote(`${decision === 'approved' ? 'Approved' : 'Rejected'} request #${id}.`);
      load();
    } catch (e) {
      setNote(e.message);
    }
  }

  return (
    <>
      <div className="filter-bar">
        {['pending', 'approved', 'rejected'].map((s) => (
          <button key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>
      {note && <p className="form-note success">{note}</p>}
      {error && <p className="form-note error">{error}</p>}
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Nothing in this queue.</p>
      ) : (
        <div className="admin-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Account</th>
              <th>Type</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Raised</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.email}</td>
                <td>{r.type}</td>
                <td>{r.plan_name || '—'}</td>
                <td>{money(r.amount_cents)}</td>
                <td>{r.method || '—'}</td>
                <td>{r.reference || '—'}</td>
                <td>{r.created_at}</td>
                <td className="row-actions">
                  {r.status === 'pending' ? (
                    <>
                      <button className="btn solid sm" onClick={() => review(r.id, 'approved')}>
                        Approve
                      </button>
                      <button className="btn outline sm" onClick={() => review(r.id, 'rejected')}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className={`pill ${r.status}`}>{r.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}

const ADJUSTMENT_TARGETS = [
  ['balance', 'Available balance'],
  ['returns', 'Returns earned'],
  ['bonus', 'Bonuses'],
  ['referral', 'Referral rewards'],
  ['deposit', 'Total deposited'],
  ['withdrawal', 'Total withdrawn']
];

function Users() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState({ category: 'balance', amount: '', direction: 'credit', reason: '' });
  const [note, setNote] = useState({ error: '', ok: '' });

  const load = () => api.admin.users().then(setRows);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function change(id, patch) {
    await api.admin.updateUser(id, patch);
    await load();
  }

  function openAdjust(u) {
    setOpenId(openId === u.id ? null : u.id);
    setForm({ category: 'balance', amount: '', direction: 'credit', reason: '' });
    setNote({ error: '', ok: '' });
  }

  async function adjust(u) {
    setNote({ error: '', ok: '' });
    try {
      const res = await api.admin.adjustBalance(u.id, form);
      const target = ADJUSTMENT_TARGETS.find(([key]) => key === form.category)?.[1] || 'Adjustment';
      setNote({ error: '', ok: `${target} updated for ${u.email} — balance is now ${money(res.balanceCents)}.` });
      setOpenId(null);
      await load();
    } catch (e) {
      setNote({ error: e.message, ok: '' });
    }
  }

  if (error) return <p className="form-note error">{error}</p>;
  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <>
      {note.error && <p className="form-note error">{note.error}</p>}
      {note.ok && <p className="form-note success">{note.ok}</p>}
      <div className="admin-table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Role</th>
            <th>Verification</th>
            <th>Balance</th>
            <th>Deposited</th>
            <th>Plans</th>
            <th>Referred by</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <Fragment key={u.id}>
              <tr>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => change(u.id, { role: e.target.value })}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <select value={u.kyc_status} onChange={(e) => change(u.id, { kycStatus: e.target.value })}>
                    {['unverified', 'pending', 'verified', 'rejected'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td>{money(u.balance_cents)}</td>
                <td>{money(u.deposited)}</td>
                <td>{u.active_plans}</td>
                <td>{u.referred_by || '—'}</td>
                <td>
                  <button className="btn ghost sm" onClick={() => openAdjust(u)}>
                    {openId === u.id ? 'Close' : 'Adjust'}
                  </button>
                </td>
              </tr>
              {openId === u.id && (
                <tr className="adjust-row">
                  <td colSpan="8">
                    <div className="adjust-form">
                      <label className="field">
                        Adjustment
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                          {ADJUSTMENT_TARGETS.map(([key, lbl]) => (
                            <option key={key} value={key}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Direction
                        <select
                          value={form.direction}
                          onChange={(e) => setForm({ ...form, direction: e.target.value })}
                        >
                          <option value="credit">Increase</option>
                          <option value="debit">Decrease</option>
                        </select>
                      </label>
                      <label className="field">
                        Amount
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </label>
                      <label className="field grow">
                        Reason (shown to the client in their history)
                        <input
                          value={form.reason}
                          onChange={(e) => setForm({ ...form, reason: e.target.value })}
                          placeholder="e.g. correction for duplicate deposit"
                        />
                      </label>
                      <button className="btn solid" onClick={() => adjust(u)}>
                        Apply to {u.email}
                      </button>
                    </div>
                    <p className="muted tiny">
                      Current balance {money(u.balance_cents)} — this moves both the selected figure and the available
                      balance, and appears in the client's history as an adjustment.
                    </p>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function PlanManager() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyPlan);
  const [error, setError] = useState('');

  const load = () => api.admin.plans().then(setRows);
  useEffect(() => {
    load();
  }, []);

  const set = (k) => (e) =>
    setDraft({ ...draft, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save(e) {
    e.preventDefault();
    setError('');
    try {
      if (draft.id) await api.admin.updatePlan(draft.id, draft);
      else await api.admin.createPlan(draft);
      setDraft(emptyPlan);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="admin-table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Plan</th>
            <th>Minimum</th>
            <th>Maximum</th>
            <th>Return</th>
            <th>Term</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{money(p.minAmount * 100)}</td>
              <td>{p.maxAmount ? money(p.maxAmount * 100) : '—'}</td>
              <td>{p.roiPct}%</td>
              <td>{p.termDays}d</td>
              <td>
                <span className={`pill ${p.active ? 'approved' : 'rejected'}`}>{p.active ? 'live' : 'off'}</span>
              </td>
              <td>
                <button className="btn ghost sm" onClick={() => setDraft({ ...p, minAmount: p.minAmount, maxAmount: p.maxAmount })}>
                  Edit
                </button>
                <button
                  className="btn ghost sm"
                  onClick={async () => {
                    await api.admin.deletePlan(p.id);
                    load();
                  }}
                >
                  Deactivate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <form className="form plan-form" onSubmit={save}>
        <h3>{draft.id ? `Edit ${draft.name}` : 'New plan'}</h3>
        <div className="grid cols-2">
          <label className="field">
            Name
            <input value={draft.name} onChange={set('name')} required />
          </label>
          <label className="field">
            Return %
            <input type="number" step="0.1" value={draft.roiPct} onChange={set('roiPct')} required />
          </label>
          <label className="field">
            Minimum amount
            <input type="number" step="0.01" value={draft.minAmount} onChange={set('minAmount')} required />
          </label>
          <label className="field">
            Maximum amount
            <input type="number" step="0.01" value={draft.maxAmount} onChange={set('maxAmount')} placeholder="blank = none" />
          </label>
          <label className="field">
            Term days
            <input type="number" value={draft.termDays} onChange={set('termDays')} required />
          </label>
          <label className="field">
            Payout
            <select value={draft.payout} onChange={set('payout')}>
              <option value="at_maturity">At maturity</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
        </div>
        <label className="field">
          Description
          <textarea rows="2" value={draft.description} onChange={set('description')} />
        </label>
        <label className="check">
          <input type="checkbox" checked={draft.active} onChange={set('active')} />
          Show this plan to clients
        </label>
        <div className="row-actions">
          <button className="btn solid" type="submit">
            {draft.id ? 'Save changes' : 'Create plan'}
          </button>
          {draft.id && (
            <button className="btn ghost" type="button" onClick={() => setDraft(emptyPlan)}>
              Cancel
            </button>
          )}
        </div>
        {error && <p className="form-note error">{error}</p>}
      </form>
    </>
  );
}

export default function AdminConsole() {
  const { user } = useAuth();
  const [tab, setTab] = useState('requests');

  const tabs = [
    ['requests', 'Requests'],
    ['users', 'Accounts'],
    ['plans', 'Plans'],
    ['content', 'Website content'],
    ['inbox', 'Messages']
  ];
  const [sectionTitle, sectionDescription] = ADMIN_SECTIONS[tab];

  return (
    <div className="container admin admin-console">
      <Seo title="Admin" noindex />
      <div className="admin-head">
        <div className="admin-heading">
          <span className="admin-eyebrow">Control center</span>
          <h1>Admin console</h1>
          <p>Manage platform activity and keep your website up to date.</p>
        </div>
        <div className="admin-account">
          <span className="admin-account-mark" aria-hidden="true">{user.email?.charAt(0).toUpperCase()}</span>
          <span>
            <strong>Administrator</strong>
            <small>{user.email}</small>
          </span>
        </div>
      </div>

      <div className="tabs admin-tabs" role="tablist" aria-label="Admin sections">
        {tabs.map(([key, lbl]) => (
          <button
            key={key}
            id={`admin-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="admin-panel"
            className={`tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {lbl}
          </button>
        ))}
      </div>

      <section className="admin-section-head" aria-live="polite">
        <div>
          <h2>{sectionTitle}</h2>
          <p>{sectionDescription}</p>
        </div>
        <span className="admin-section-tag">Workspace</span>
      </section>

      <div className="panel admin-panel" id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`}>
        {tab === 'requests' && <Requests />}
        {tab === 'users' && <Users />}
        {tab === 'plans' && <PlanManager />}
        {tab === 'inbox' && <Inbox />}
        {tab === 'content' && <ContentEditor />}
      </div>
    </div>
  );
}

function Inbox() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.admin.submissions().then(setRows).catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="form-note error">{error}</p>;
  if (!rows) return <p className="muted">Loading…</p>;
  if (!rows.length) return <p className="muted">No messages yet.</p>;
  return (
    <div className="admin-table-wrap">
    <table className="table">
      <thead>
        <tr>
          <th>Kind</th>
          <th>Name</th>
          <th>Email</th>
          <th>Detail</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.kind}</td>
            <td>{r.name || '—'}</td>
            <td>{r.email}</td>
            <td>{r.payload.message || r.payload.topic || '—'}</td>
            <td>{r.created_at}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
