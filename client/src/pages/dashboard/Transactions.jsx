import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';

const TYPES = ['', 'deposit', 'withdrawal', 'investment', 'profit', 'bonus', 'referral_bonus', 'adjustment'];
const label = (t) => t.replace(/_/g, ' ');

export default function Transactions() {
  const [rows, setRows] = useState(null);
  const [type, setType] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .transactions(type ? `?type=${type}` : '')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [type]);

  return (
    <>
      <h1>Transaction history</h1>
      <div className="filter-bar">
        <label className="field inline">
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t ? label(t) : 'All types'}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="form-note error">{error}</p>}
      {!rows ? (
        <p className="muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted">No transactions recorded.</p>
      ) : (
        <div className="dash-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>{t.created_at}</td>
                <td>
                  <span className={`pill ${t.status}`}>{t.status}</span>
                </td>
                <td>{money(t.amount_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </>
  );
}
