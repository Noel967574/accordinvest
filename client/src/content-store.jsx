import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const ContentContext = createContext({ content: {}, reload: async () => {} });

export function ContentProvider({ children }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  async function reload() {
    try {
      setContent(await api.content());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    reload();
    document.documentElement.style.setProperty('--brand', content?.branding?.primaryColor || '#6e00ff');
  }, [content?.branding?.primaryColor]);

  if (error && !content) return <div className="fatal">Content service unavailable: {error}</div>;
  if (!content) return <div className="fatal loading">Loading…</div>;

  return <ContentContext.Provider value={{ content, reload }}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
