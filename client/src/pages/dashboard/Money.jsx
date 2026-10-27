import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';
import { useContent } from '../../content-store.jsx';

const BASE_METHODS = ['Bank transfer', 'Card', 'Crypto'];

export default function Money() {
  const { content } = useContent();
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ amount: '', method: BASE_METHODS[0], reference: '' });
  const [note, setNote] = useState({ error: '', ok: '' });

  const apps = Array.isArray(content.payment?.paymentApps)
    ? content.payment.paymentApps.filter((a) => a && a.name)
    : [];
  const methods = [...BASE_METHODS, ...apps.map((a) => a.name)];
  const selectedApp = apps.find((a) => a.name === form.method);

  const load = () => api.summary().then(setSummary);
  useEffect(() => {
    load().catch((e) => setNote({ error: e.message, ok: '' }));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(kind) {
    setNote({ error: '', ok: '' });
    try {
      const res = await api[kind]({ amount: form.amount, method: form.method, reference: form.reference });
      setNote({ error: '', ok: res.message });
      setForm({ amount: '', method: BASE_METHODS[0], reference: '' });
      await load();
    } catch (e) {
      setNote({ error: e.message, ok: '' });
    }
  }

  if (!summary) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Deposit &amp; withdraw</h1>
      <div className="grid cols-3">
        <div className="stat-card">
          <span>Balance</span>
          <strong>{money(summary.totals.balanceCents)}</strong>
        </div>
        <div className="stat-card">
          <span>Available</span>
          <strong>{money(summary.totals.availableCents)}</strong>
        </div>
        <div className="stat-card">
          <span>Pending withdrawals</span>
          <strong>{money(summary.totals.pendingWithdrawalCents)}</strong>
        </div>
      </div>

      <div className="card money-card">
        <h3>Amount</h3>
        <input type="number" min="10" step="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00" />
        <h3>Method</h3>
        <select value={form.method} onChange={set('method')}>
          {methods.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>

        {selectedApp && (
          <>
            <div className="pay-details">
              <span>{selectedApp.name} account</span>
              <strong className="mono">
                {selectedApp.handle || '—'}{' '}
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => navigator.clipboard?.writeText(selectedApp.handle || '')}
                >
                  Copy
                </button>
              </strong>
            </div>
            {selectedApp.note && <p className="muted tiny">{selectedApp.note}</p>}
          </>
        )}

        <h3>{selectedApp ? 'Payment reference' : 'Account reference'}</h3>
        <input
          value={form.reference}
          onChange={set('reference')}
          placeholder={selectedApp ? `The reference shown in ${selectedApp.name}` : 'Optional — where funds should be sent'}
        />
        <div className="hero-cta">
          <button className="btn solid" onClick={() => submit('deposit')}>
            Request deposit
          </button>
          <button className="btn outline" onClick={() => submit('withdraw')}>
            Request withdrawal
          </button>
        </div>
        {note.error && <p className="form-note error">{note.error}</p>}
        {note.ok && <p className="form-note success">{note.ok}</p>}
        <p className="muted tiny">
          Requests are reviewed by our team before funds move, and appear in your history as pending until then.
        </p>
      </div>
    </>
  );
}













