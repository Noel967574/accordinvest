import { useState } from 'react';
import { api } from '../api.js';
import { useContent } from '../content-store.jsx';
import { Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';

const empty = { name: '', email: '', topic: '', message: '' };

export default function Contact() {
  const { content } = useContent();
  const { contact, branding } = content;
  const [form, setForm] = useState(empty);
  const [state, setState] = useState({ status: 'idle', error: '', ok: '' });

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'sending', error: '', ok: '' });
    try {
      await api.contact(form);
      setForm(empty);
      setState({ status: 'idle', error: '', ok: contact.successMessage || 'Message sent.' });
    } catch (err) {
      setState({ status: 'idle', error: err.message, ok: '' });
    }
  }

  return (
    <Section className="page">
      <Seo title={contact.heading} description={contact.intro} />
      <h1 className="page-title">{contact.heading}</h1>
      <p className="muted">{contact.intro}</p>

      <div className="contact-grid">
        <form className="form" onSubmit={submit}>
          <label>
            Name
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label>
            Topic
            <input value={form.topic} onChange={set('topic')} placeholder="Optional" />
          </label>
          <label>
            Message
            <textarea rows="6" value={form.message} onChange={set('message')} required />
          </label>
          <button className="btn solid lg" type="submit" disabled={state.status === 'sending'}>
            {state.status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
          {state.error && <p className="form-note error">{state.error}</p>}
          {state.ok && <p className="form-note success">{state.ok}</p>}
        </form>

        <aside className="card details">
          <h3>Direct</h3>
          <ul className="detail-list">
            <li>
              <span>Email</span>
              {branding.supportEmail}
            </li>
            <li>
              <span>Phone</span>
              {branding.supportPhone}
            </li>
            <li>
              <span>Office</span>
              {branding.address}
            </li>
          </ul>
        </aside>
      </div>
    </Section>
  );
}
