import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ token: params.get('token') || '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('The two passwords do not match.');
    try {
      await api.resetPassword({ token: form.token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Section className="page narrow">
      <Seo title="Choose a new password" noindex />
      <h1 className="page-title">Choose a new password</h1>
      {done ? (
        <>
          <p className="form-note success">Password updated — you can sign in now.</p>
          <div className="auth-links">
            <Link to="/login">Go to sign in</Link>
          </div>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          <label>
            New password
            <input type="password" value={form.password} onChange={set('password')} minLength="8" required />
          </label>
          <label>
            Confirm password
            <input type="password" value={form.confirm} onChange={set('confirm')} minLength="8" required />
          </label>
          <button className="btn solid lg" type="submit">
            Update password
          </button>
          {error && <p className="form-note error">{error}</p>}
        </form>
      )}
    </Section>
  );
}
