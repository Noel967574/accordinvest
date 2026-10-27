import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-store.jsx';
import AuthPageLayout from '../components/AuthPageLayout.jsx';
import Seo from '../components/Seo.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(form);
      navigate(user.role === 'admin' ? '/admin' : next, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Seo title="Sign in" noindex />
      <AuthPageLayout
        eyebrow="Welcome back"
        title="Sign in to your account"
        description="Enter your account details to continue to your investment dashboard."
      >
      <form className="form auth-form" onSubmit={submit}>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" required />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.remember} onChange={set('remember')} />
          Keep me signed in
        </label>
        <button className="btn solid lg auth-submit" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="form-note error">{error}</p>}
      </form>
      <div className="auth-links">
        <span>New to Accord? <Link to="/register">Create an account</Link></span>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
      </AuthPageLayout>
    </>
  );
}
