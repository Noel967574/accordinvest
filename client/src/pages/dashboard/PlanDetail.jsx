import { Link, useParams } from 'react-router-dom';
import { useContent } from '../../content-store.jsx';
import { Section } from '../../components/Section.jsx';
import Seo from '../../components/Seo.jsx';

export default function PlanDetail() {
  const { content } = useContent();
  const { planName } = useParams();
  const plan = content.plans.cards.find((card) => card.name.toLowerCase() === planName?.toLowerCase());

  if (!plan) return <div className="fatal">Plan not found.</div>;

  return (
    <Section className="page narrow">
      <Seo title={`${plan.name} plan`} />
      <Link className="muted" to="/#plans">← All plans</Link>
      <article className={`plan ${plan.featured ? 'featured' : ''}`}>
        {plan.featured && <span className="tag">Popular</span>}
        <h1>{plan.name}</h1>
        <div className="price">
          <strong>{plan.price}</strong>
          <span>{plan.period}</span>
        </div>
        <p className="muted">{plan.blurb}</p>
        <h2>Plan benefits</h2>
        <ul className="perk-list">
          {plan.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>
        <Link className="btn solid lg" to="/dashboard/plans">
          Continue to investment plans
        </Link>
      </article>
    </Section>
  );
}
