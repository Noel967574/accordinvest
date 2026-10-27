import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      setResult(await api.forgotPassword(email));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Section className="page narrow">
      <Seo title="Reset password" noindex />
      <h1 className="page-title">Reset your password</h1>
      <p className="muted">Enter your email and we will send a link to set a new password.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button className="btn solid lg" type="submit">
          Send reset link
        </button>
        {error && <p className="form-note error">{error}</p>}
      </form>
      {result?.ok && (
        <p className="form-note success">
          If that address has an account, a reset link is on its way.
          {result.devResetLink && (
            <>
              <br />
              No mail server is configured, so here is the link for local testing:{' '}
              <Link to={`/reset-password?token=${result.devResetLink.split('token=')[1]}`}>open reset page</Link>
            </>
          )}
        </p>
      )}
      <div className="auth-links">
        <Link to="/login">Back to sign in</Link>
      </div>
    </Section>
  );
}
