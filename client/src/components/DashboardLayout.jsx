import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth-store.jsx';
import Seo from '../components/Seo.jsx';

const links = [
  { to: '/dashboard', label: 'Overview', end: true },
  { to: '/dashboard/plans', label: 'Investment plans' },
  { to: '/dashboard/money', label: 'Deposit & withdraw' },
  { to: '/dashboard/transactions', label: 'History' },
  { to: '/dashboard/referrals', label: 'Referrals' },
  { to: '/dashboard/settings', label: 'Settings' }
];

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <>
      <Seo title="Account" noindex />
      <div className="dash">
        <aside className="dash-side">
          <div className="dash-profile">
            <span className="dash-avatar" aria-hidden="true">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="dash-profile-copy">
              <strong>{user.name || 'Investor account'}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <div className="dash-side-label">Account menu</div>
          <nav className="dash-nav" aria-label="Account navigation">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                {l.label}
              </NavLink>
            ))}
            {user.role === 'admin' && (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
                Admin console
              </NavLink>
            )}
          </nav>
        </aside>
        <div className="dash-main">
          <Outlet />
        </div>
      </div>
    </>
  );
}
