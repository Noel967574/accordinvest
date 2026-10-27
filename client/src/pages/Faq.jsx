import { useContent } from '../content-store.jsx';
import { Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';

export default function Faq() {
  const { content } = useContent();
  const { faq } = content;

  return (
    <Section className="page narrow">
      <Seo title={faq.heading} description={faq.items[0]?.q} />
      <h1 className="page-title">{faq.heading}</h1>
      <div className="faq-list">
        {faq.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
