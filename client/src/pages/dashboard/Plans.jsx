import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, money } from '../../api.js';

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.plans(), api.summary()])
      .then(([availablePlans, account]) => {
        setPlans(availablePlans);
        setSummary(account);
      })
      .catch((e) => setError(e.message));
  }, []);

  function buyPlan(plan) {
    const amount = amounts[plan.id] || String(plan.minAmount);
    navigate(`/checkout/${plan.id}?amount=${encodeURIComponent(amount)}`);
  }

  if (error) return <p className="form-note error">{error}</p>;
  if (!summary) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Investment plans</h1>
      <p className="muted">
        Available to invest: <strong>{money(summary.totals.availableCents)}</strong>
      </p>
      <div className="grid cols-3">
        {plans.map((plan) => (
          <article className={`plan ${plan.payout !== 'at_maturity' ? 'featured' : ''}`} key={plan.id}>
            <h3>{plan.name}</h3>
            <p className="muted">{plan.description}</p>
            <dl className="spec">
              <div>
                <dt>Return</dt>
                <dd>{plan.roiPct}%</dd>
              </div>
              <div>
                <dt>Term</dt>
                <dd>{plan.termDays} days</dd>
              </div>
              <div>
                <dt>Minimum</dt>
                <dd>{money(plan.minAmount * 100)}</dd>
              </div>
              <div>
                <dt>Payout</dt>
                <dd>{plan.payout === 'at_maturity' ? 'At maturity' : plan.payout}</dd>
              </div>
            </dl>
            <label className="field">
              Amount
              <input
                type="number"
                min={plan.minAmount}
                max={plan.maxAmount || undefined}
                step="0.01"
                value={amounts[plan.id] || ''}
                onChange={(e) => setAmounts({ ...amounts, [plan.id]: e.target.value })}
                placeholder={`${plan.minAmount}–${plan.maxAmount || '∞'}`}
              />
            </label>
            <button className="btn solid" onClick={() => buyPlan(plan)}>
              Buy this plan
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
