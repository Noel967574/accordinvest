import { useContent } from '../content-store.jsx';
import { Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';

export default function About() {
  const { content } = useContent();
  const { about } = content;

  return (
    <Section className="page">
      <Seo title={about.heading} description={about.paragraphs[0]} />
      <h1 className="page-title">{about.heading}</h1>
      {about.paragraphs.map((p, i) => (
        <p className="prose" key={i}>
          {p}
        </p>
      ))}
      <div className="grid cols-2 tight">
        {about.values.map((v) => (
          <article className="card" key={v.title}>
            <h3>{v.title}</h3>
            <p className="muted">{v.body}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
