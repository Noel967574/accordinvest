import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';

export default function Referrals() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.referral().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-note error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Select the link and copy it manually.');
    }
  }

  return (
    <>
      <h1>Referrals</h1>
      <p className="muted">
        Share your link and earn {data.bonusPct}% of a new account's first approved deposit.
      </p>
      <div className="grid cols-3">
        <div className="stat-card">
          <span>People referred</span>
          <strong>{data.referredCount}</strong>
        </div>
        <div className="stat-card">
          <span>Earned</span>
          <strong>{money(data.earnedCents)}</strong>
        </div>
        <div className="stat-card">
          <span>Your code</span>
          <strong>{data.code}</strong>
        </div>
      </div>
      <div className="copy-row">
        <input readOnly value={data.link} onFocus={(e) => e.target.select()} />
        <button className="btn solid" onClick={copy}>
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {error && <p className="form-note error">{error}</p>}
    </>
  );
}
