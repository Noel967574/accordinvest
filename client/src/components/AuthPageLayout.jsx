import { Link } from 'react-router-dom';

export default function AuthPageLayout({ eyebrow, title, description, children }) {
  return (
    <section className="auth-page">
      <aside className="auth-visual">
        <Link className="auth-logo" to="/" aria-label="Accord Capital Investments home">
          <img src="/brand-logo.png" alt="Accord Capital Investments" />
        </Link>
        <div className="auth-visual-copy">
          <span className="auth-eyebrow">Accord Capital Investments</span>
          <h2>Invest with greater clarity.</h2>
          <p>Review investment plans, follow your account activity, and manage your account in one place.</p>
        </div>
        <ul className="auth-highlights">
          <li>Plan details in one place</li>
          <li>Account activity at a glance</li>
          <li>Support when you need it</li>
        </ul>
        <span className="auth-visual-note">Investing involves risk. Review plan terms before investing.</span>
      </aside>

      <div className="auth-panel">
        <div className="auth-card">
          <span className="auth-form-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
