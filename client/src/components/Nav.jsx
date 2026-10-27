import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useContent } from '../content-store.jsx';
import { useAuth } from '../auth-store.jsx';

export default function Nav() {
  const { content } = useContent();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { nav } = content;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link className="brand" to="/" aria-label="Accord Capital Investments home" onClick={() => setOpen(false)}>
          <img className="brand-logo" src="/brand-logo.png" alt="" />
        </Link>

        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span />
          <span />
        </button>

        <div className={`nav-body ${open ? 'is-open' : ''}`}>
          <nav className="nav-links">
            {nav.links.map((l) => (
              <NavLink key={l.href} to={l.href} end={l.href === '/'} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            {user ? (
              <>
                <Link className="btn ghost" to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={() => setOpen(false)}>
                  {user.role === 'admin' ? 'Admin' : 'My account'}
                </Link>
                <button
                  className="btn solid"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link className="btn ghost" to="/login" onClick={() => setOpen(false)}>
                  {nav.ctaPrimary}
                </Link>
                <Link className="btn solid" to="/register" onClick={() => setOpen(false)}>
                  {nav.ctaSecondary}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
