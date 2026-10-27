import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth-store.jsx';
import { useContent } from '../content-store.jsx';

export default function Footer() {
  const { content } = useContent();
  const { user } = useAuth();
  const { branding, nav } = content;
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  async function subscribe(e) {
    e.preventDefault();
    try {
      await api.newsletter({ email });
      setNote('Subscribed.');
      setEmail('');
    } catch (err) {
      setNote(err.message);
    }
  }

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img className="brand-logo footer-logo" src="/brand-logo.png" alt="Accord Capital Investments" />
          <p className="muted">{branding.tagline}</p>
          <form className="subscribe" onSubmit={subscribe}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn solid" type="submit">
              Subscribe
            </button>
          </form>
          {note && <p className="form-note">{note}</p>}
        </div>

        <div>
          <h4>Pages</h4>
          <ul className="link-list">
            {nav.links.map((l) => (
              <li key={l.href}>
                <Link to={l.href}>{l.label}</Link>
              </li>
            ))}
            <li>
              <Link to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'}>
                {user ? (user.role === 'admin' ? 'Admin console' : 'My account') : 'Sign in'}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Support</h4>
          <ul className="link-list">
            <li>{branding.supportEmail}</li>
            <li>{branding.supportPhone}</li>
            <li>{branding.address}</li>
          </ul>
        </div>
      </div>
      <div className="container footer-base">{branding.footerNote}</div>
    </footer>
  );
}
