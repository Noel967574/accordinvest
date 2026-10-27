import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth-store.jsx';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [pass, setPass] = useState({ currentPassword: '', password: '', confirm: '' });
  const [note, setNote] = useState({ error: '', ok: '' });

  const setP = (k) => (e) => setPass({ ...pass, [k]: e.target.value });

  async function saveProfile(e) {
    e.preventDefault();
    setNote({ error: '', ok: '' });
    try {
      const res = await api.updateProfile({ name });
      setUser(res.user);
      setNote({ error: '', ok: 'Profile updated.' });
    } catch (err) {
      setNote({ error: err.message, ok: '' });
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setNote({ error: '', ok: '' });
    if (pass.password !== pass.confirm) return setNote({ error: 'The two new passwords do not match.', ok: '' });
    try {
      await api.changePassword({ currentPassword: pass.currentPassword, password: pass.password });
      setPass({ currentPassword: '', password: '', confirm: '' });
      setNote({ error: '', ok: 'Password changed.' });
    } catch (err) {
      setNote({ error: err.message, ok: '' });
    }
  }

  return (
    <>
      <h1>Settings</h1>
      <div className="grid cols-2">
        <form className="card" onSubmit={saveProfile}>
          <h3>Profile</h3>
          <label className="field">
            Display name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Email
            <input value={user.email} readOnly />
          </label>
          <p className="muted tiny">Account created {user.joinedAt}</p>
          <button className="btn solid" type="submit">
            Save profile
          </button>
        </form>

        <form className="card" onSubmit={savePassword}>
          <h3>Password</h3>
          <label className="field">
            Current password
            <input type="password" value={pass.currentPassword} onChange={setP('currentPassword')} required />
          </label>
          <label className="field">
            New password
            <input type="password" value={pass.password} onChange={setP('password')} minLength="8" required />
          </label>
          <label className="field">
            Confirm new password
            <input type="password" value={pass.confirm} onChange={setP('confirm')} minLength="8" required />
          </label>
          <button className="btn outline" type="submit">
            Change password
          </button>
        </form>
      </div>
      {note.error && <p className="form-note error">{note.error}</p>}
      {note.ok && <p className="form-note success">{note.ok}</p>}
    </>
  );
}
