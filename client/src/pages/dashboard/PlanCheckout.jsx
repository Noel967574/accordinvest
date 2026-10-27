import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, money } from '../../api.js';
import { useContent } from '../../content-store.jsx';
import Seo from '../../components/Seo.jsx';

export default function PlanCheckout() {
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const { content } = useContent();
  const payment = content.payment || {};
  const apps = Array.isArray(payment.paymentApps) ? payment.paymentApps.filter((app) => app && app.name) : [];
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [method, setMethod] = useState('crypto');
  const [reference, setReference] = useState('');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [walletCopyMessage, setWalletCopyMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const walletAddressRef = useRef(null);

  useEffect(() => {
    Promise.all([api.plans(), api.summary()])
      .then(([availablePlans, account]) => {
        setPlans(availablePlans);
        setSummary(account);
      })
      .catch((e) => setError(e.message));
  }, []);

  const plan = plans.find((item) => String(item.id) === planId);
  const selectedApp = method.startsWith('app:') ? apps.find((app) => app.name === method.slice(4)) : null;
  const methodOptions = [
    ['balance', 'Account balance'],
    ['card', 'Card'],
    ['crypto', 'Bitcoin'],
    ['bank', 'Bank transfer'],
    ...apps.map((app) => [`app:${app.name}`, app.name])
  ];

  async function copyWalletAddress() {
    try {
      if (!payment.cryptoAddress) throw new Error('No wallet address is configured.');
      try {
        await navigator.clipboard.writeText(payment.cryptoAddress);
      } catch (clipboardError) {
        const addressField = walletAddressRef.current;
        addressField?.focus();
        addressField?.select();
        if (!addressField?.ownerDocument.execCommand('copy')) throw clipboardError;
      }
      setWalletCopyMessage('Wallet address copied.');
    } catch {
      setWalletCopyMessage('Could not copy automatically. Select the address and copy it manually.');
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (method === 'balance') {
        await api.invest({ planId: plan.id, amount });
        setMessage('Investment opened successfully.');
      } else {
        const result = await api.payPlan({
          planId: plan.id,
          amount,
          method: selectedApp ? 'app' : method,
          app: selectedApp?.name,
          reference,
          card: method === 'card' ? card : undefined
        });
        setMessage(
          result.paid
            ? `Payment approved — your ${plan.name} plan is active and matures ${result.maturesAt}.`
            : result.message
        );
      }
      const updatedSummary = await api.summary();
      setSummary(updatedSummary);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !plans.length) return <div className="checkout-page"><p className="form-note error">{error}</p></div>;
  if (!summary) return <div className="checkout-page"><p className="muted">Loading checkout…</p></div>;
  if (!plan) return <div className="checkout-page"><p className="form-note error">This plan is no longer available.</p></div>;

  return (
    <section className="checkout-page">
      <Seo title={`Checkout — ${plan.name}`} noindex />
      <div className="checkout-shell">
        <Link className="checkout-back" to="/dashboard/plans">← Back to investment plans</Link>
        <header className="checkout-heading">
          <span className="checkout-eyebrow">Secure checkout</span>
          <h1>Complete your investment</h1>
          <p className="muted">Review your selected plan and payment details before continuing.</p>
        </header>

        <div className="checkout-grid">
          <article className="checkout-summary">
            <h2>{plan.name}</h2>
            <p className="muted">{plan.description}</p>
            <dl className="spec">
              <div><dt>Return</dt><dd>{plan.roiPct}%</dd></div>
              <div><dt>Term</dt><dd>{plan.termDays} days</dd></div>
              <div><dt>Minimum</dt><dd>{money(plan.minAmount * 100)}</dd></div>
              <div><dt>Payout</dt><dd>{plan.payout === 'at_maturity' ? 'At maturity' : plan.payout}</dd></div>
            </dl>
            <div className="checkout-balance">
              <span>Available balance</span>
              <strong>{money(summary.totals.availableCents)}</strong>
            </div>
          </article>

          <form className="checkout-form" onSubmit={submit}>
            <label className="field">
              Investment amount
              <input
                type="number"
                min={plan.minAmount}
                max={plan.maxAmount || undefined}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <label className="field">
              Payment method
              <select value={method} onChange={(e) => { setMethod(e.target.value); setWalletCopyMessage(''); }}>
                {methodOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            {method === 'balance' && (
              <p className="muted tiny">Funds will be taken from your available account balance.</p>
            )}

            {method === 'card' && (
              <div className="checkout-payment-fields">
                <label className="field">Card number
                  <input inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" required />
                </label>
                <label className="field">Name on card
                  <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} autoComplete="cc-name" required />
                </label>
                <div className="grid cols-2">
                  <label className="field">Expiry
                    <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" required />
                  </label>
                  <label className="field">CVC
                    <input inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} required />
                  </label>
                </div>
                <p className="muted tiny">{payment.cardNote}</p>
              </div>
            )}

            {method === 'crypto' && (
              <div className="checkout-payment-fields">
                <div className="pay-details">
                  <span>Network</span><strong>{payment.cryptoNetwork || '—'}</strong>
                </div>
                <div className="wallet-address-card">
                  <div>
                    <strong>Bitcoin wallet address</strong>
                    <p className="muted tiny">Copy this address into your Bitcoin wallet when sending payment.</p>
                  </div>
                  <textarea
                    ref={walletAddressRef}
                    aria-label="Bitcoin wallet address"
                    className="wallet-address-input mono"
                    readOnly
                    rows="2"
                    value={payment.cryptoAddress || ''}
                    placeholder="Wallet address not configured"
                    onFocus={(e) => e.target.select()}
                  />
                  <button type="button" className="btn solid wallet-copy-button" onClick={copyWalletAddress}>
                    Copy wallet address
                  </button>
                  {walletCopyMessage && (
                    <p className={`form-note ${walletCopyMessage.startsWith('Wallet address copied') ? 'success' : 'error'}`} role="status">
                      {walletCopyMessage}
                    </p>
                  )}
                </div>
                <p className="muted tiny">{payment.cryptoInstructions}</p>
                <label className="field">Transaction hash
                  <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Paste the hash of your transfer" required />
                </label>
              </div>
            )}

            {method === 'bank' && (
              <div className="checkout-payment-fields">
                <div className="pay-details">
                  <span>Bank</span><strong>{payment.bankName || '—'}</strong>
                  <span>Account name</span><strong>{payment.accountName || '—'}</strong>
                  <span>Account number</span><strong className="mono">{payment.accountNumber || '—'}</strong>
                  <span>SWIFT / BIC</span><strong className="mono">{payment.swift || '—'}</strong>
                </div>
                <p className="muted tiny">{payment.bankInstructions}</p>
                <label className="field">Transfer reference
                  <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional transfer reference" />
                </label>
              </div>
            )}

            {selectedApp && (
              <div className="checkout-payment-fields">
                <div className="pay-details"><span>{selectedApp.name} account</span><strong className="mono">{selectedApp.handle || '—'}</strong></div>
                {selectedApp.note && <p className="muted tiny">{selectedApp.note}</p>}
                <label className="field">Payment reference
                  <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={`Reference shown in ${selectedApp.name}`} required />
                </label>
              </div>
            )}

            {error && <p className="form-note error" role="alert">{error}</p>}
            {message && <p className="form-note success" role="status">{message}</p>}
            <button className="btn solid lg checkout-submit" type="submit" disabled={busy}>
              {busy ? 'Processing…' : method === 'card' ? `Pay ${money(Number(amount || 0) * 100)}` : method === 'balance' ? 'Invest from balance' : 'Submit payment'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
