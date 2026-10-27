import { useEffect } from 'react';
import { useContent } from '../content-store.jsx';

function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export default function Seo({ title, description, noindex = false }) {
  const { content } = useContent();

  useEffect(() => {
    const { siteName, tagline } = content.branding;
    const fullTitle = title ? `${title} — ${siteName}` : `${siteName} — ${tagline}`;
    const desc = description || tagline;

    document.title = fullTitle;
    setMeta('name', 'robots', noindex ? 'noindex,nofollow' : 'index,follow');
    setMeta('name', 'description', desc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', siteName);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
  }, [title, description, content]);

  return null;
}
