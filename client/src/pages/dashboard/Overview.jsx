import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api.js';
import { useAuth } from '../../auth-store.jsx';

const CARDS = [
  ['balanceCents', 'Available balance'],
  ['totalProfitCents', 'Returns earned'],
  ['bonusCents', 'Bonuses'],
  ['referralBonusCents', 'Referral rewards'],
  ['totalDepositCents', 'Total deposited'],
  ['totalWithdrawalCents', 'Total withdrawn']
];

export default function Overview() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.summary().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-note error">{error}</p>;
  if (!data) return <p className="muted">Loading your account…</p>;

  return (
    <>
      <section className="account-welcome">
        <div>
          <span className="account-eyebrow">Account overview</span>
          <h1>Welcome back, {user.name || user.email}</h1>
          <p>Your account activity and investment summary, all in one place.</p>
        </div>
        <div className="account-welcome-actions">
          <Link className="btn outline" to="/dashboard/money">Deposit &amp; withdraw</Link>
          <Link className="btn solid" to="/dashboard/plans">Explore plans</Link>
        </div>
      </section>
      <div className="grid cols-3 account-stats">
        {CARDS.map(([key, title]) => (
          <div className="stat-card account-stat-card" key={key}>
            <span>{title}</span>
            <strong>{money(data.totals[key])}</strong>
          </div>
        ))}
      </div>

      <section className="dash-block">
        <div className="block-head">
          <div>
            <h2>Active investments</h2>
            <p className="dash-block-caption">Plans currently running on your account.</p>
          </div>
          <Link className="btn outline sm" to="/dashboard/plans">
            Invest funds
          </Link>
        </div>
        {data.activePlans.length === 0 ? (
          <div className="account-empty">
            <span className="account-empty-mark" aria-hidden="true">+</span>
            <div>
              <strong>No active investments yet</strong>
              <p>Explore available plans to find an option that suits your goals.</p>
            </div>
            <Link className="btn solid sm" to="/dashboard/plans">Browse plans</Link>
          </div>
        ) : (
          <div className="dash-table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Invested</th>
                <th>Return</th>
                <th>Matures</th>
              </tr>
            </thead>
            <tbody>
              {data.activePlans.map((p) => (
                <tr key={p.id}>
                  <td>{p.plan_name}</td>
                  <td>{money(p.principal_cents)}</td>
                  <td>{p.roi_pct}%</td>
                  <td>{p.matures_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="dash-block">
        <div className="block-head">
          <h2>Recent activity</h2>
          <Link className="btn ghost sm" to="/dashboard/transactions">
            View all
          </Link>
        </div>
        {data.recentTransactions.length === 0 ? (
          <div className="account-empty compact">
            <div>
              <strong>No recent activity</strong>
              <p>Account transactions will appear here when available.</p>
            </div>
          </div>
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
              {data.recentTransactions.map((t) => (
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
      </section>
    </>
  );
}
