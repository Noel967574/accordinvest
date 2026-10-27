import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useContent } from '../content-store.jsx';
import { useAuth } from '../auth-store.jsx';

const SECTION_LABELS = {
  branding: 'Branding & contact',
  nav: 'Navigation',
  hero: 'Home — hero',
  security: 'Home — security',
  features: 'Home — features',
  plans: 'Home — plans',
  testimonials: 'Home — testimonials',
  faq: 'FAQ page',
  payment: 'Payment details'
};

function Field({ label, value, onChange }) {
  const long = String(value ?? '').length > 70;
  return (
    <label className="field">
      <span>{label}</span>
      {long ? (
        <textarea rows="3" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function Editor({ value, onChange, label }) {
  if (typeof value === 'string' || typeof value === 'number') {
    return <Field label={label} value={value} onChange={onChange} />;
  }

  if (Array.isArray(value)) {
    const update = (i, next) => onChange(value.map((v, idx) => (idx === i ? next : v)));
    return (
      <div className="group">
        {label && <span className="group-label">{label}</span>}
        {value.map((item, i) => (
          <div className="row" key={i}>
            <div className="row-body">
              {typeof item === 'object' && item !== null ? (
                Object.entries(item).map(([k, v]) => (
                  <Editor key={k} label={k} value={v} onChange={(nv) => update(i, { ...item, [k]: nv })} />
                ))
              ) : (
                <Editor value={item} onChange={(nv) => update(i, nv)} />
              )}
            </div>
            <button type="button" className="chip danger" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() =>
            onChange([
              ...value,
              typeof value[0] === 'object' && value[0] !== null
                ? Object.fromEntries(Object.keys(value[0]).map((k) => [k, '']))
                : ''
            ])
          }
        >
          Add item
        </button>
      </div>
    );
  }

  return (
    <div className="group">
      {label && <span className="group-label">{label}</span>}
      {Object.entries(value).map(([k, v]) => (
        <Editor key={k} label={k} value={v} onChange={(nv) => onChange({ ...value, [k]: nv })} />
      ))}
    </div>
  );
}

export default function ContentEditor() {
  const { content, reload } = useContent();
  const { user } = useAuth();
  const keys = Object.keys(SECTION_LABELS);
  const [tab, setTab] = useState('hero');
  const [draft, setDraft] = useState(content[tab]);
  const [status, setStatus] = useState('');

  useEffect(() => setDraft(content[tab]), [tab, content]);

  async function save() {
    setStatus('');
    try {
      await api.admin.saveSection(tab, draft);
      await reload();
      setStatus('Saved — public pages now show this text.');
    } catch (e) {
      setStatus(e.message);
    }
  }

  const isAdmin = user?.role === 'admin';

  return (
    <>
      <div className="tabs">
        {keys.map((k) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {SECTION_LABELS[k]}
          </button>
        ))}
      </div>
      <Editor value={draft} onChange={setDraft} />
      <div className="save-bar">
        <button className="btn solid lg" onClick={save} disabled={!isAdmin}>
          Save {SECTION_LABELS[tab]}
        </button>
        {status && <span className="form-note success">{status}</span>}
      </div>
    </>
  );
}
