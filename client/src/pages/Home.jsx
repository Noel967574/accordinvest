import { useContent } from '../content-store.jsx';
import { Heading, Section } from '../components/Section.jsx';
import Seo from '../components/Seo.jsx';
import { Link } from 'react-router-dom';

export default function Home() {
  const { content } = useContent();
  const { hero, security, features, plans, testimonials } = content;

  return (
    <div className="home-page">
      <Seo description={hero.subheading} />
      <section className="hero home-hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            {hero.eyebrow && <span className="eyebrow">{hero.eyebrow}</span>}
            <h1>{hero.heading}</h1>
            <p className="lead">{hero.subheading}</p>
            <div className="hero-cta">
              <a className="btn solid lg" href="#plans">
                {hero.primaryCta}
                <span aria-hidden="true">→</span>
              </a>
              <Link className="btn outline lg" to="/login">
                {hero.secondaryCta}
              </Link>
            </div>
            <div className="hero-points" aria-label="Platform features">
              <span>Plan details upfront</span>
              <span>Account activity tracking</span>
              <span>Dedicated account support</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-visual-frame">
              <img src="/hero-image.jpg" alt="Investment professionals reviewing market information" />
              <div className="hero-visual-shade" />
              <div className="hero-visual-label">
                <span className="hero-label-icon" aria-hidden="true">A</span>
                <span>
                  <strong>Invest with clarity</strong>
                  <small>Information to help you make informed choices</small>
                </span>
              </div>
              <div className="hero-visual-caption">
                <span className="caption-kicker">A considered approach</span>
                <strong>Understand the plan before you invest.</strong>
                <span>Review the amount, term and stated return in one place.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Section id="security" className="confidence-section">
        <Heading data={security} />
        <div className="grid cols-2">
          {security.items.map((item, index) => (
            <article className="card confidence-card" key={item.title}>
              <span className="icon" aria-hidden="true">{index === 0 ? '01' : '02'}</span>
              <div>
                <h3>{item.title}</h3>
                <p className="muted">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section id="features" className="tint feature-section">
        <Heading data={features} />
        <div className="grid cols-3">
          {features.items.map((item) => (
            <article className="card feature-card" key={item.title}>
              <span className="feature-mark" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="plans" className="opportunities-section">
        <Heading data={plans} />
        <div className="home-plan-grid">
          {plans.cards.map((card, index) => (
            <article className={`plan home-plan-card ${card.featured ? 'featured' : ''}`} key={card.name}>
              {card.featured && <span className="tag">Popular choice</span>}
              <div className="plan-card-topline">
                <span className="plan-index">0{index + 1}</span>
                {card.featured && <span className="plan-featured-label">Featured plan</span>}
              </div>
              <h3>{card.name}</h3>
              <p className="muted home-plan-blurb">{card.blurb}</p>
              <div className="home-plan-price">
                <strong>{card.price}</strong>
                <span>starting plan amount</span>
              </div>
              <div className="home-plan-term">
                <span>Plan term</span>
                <strong>{card.period}</strong>
              </div>
              <ul className="perk-list">
                {card.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link className={`btn ${card.featured ? 'solid' : 'outline'} home-plan-cta`} to={`/dashboard/plan/${encodeURIComponent(card.name)}`}>
                {plans.ctaLabel || 'Choose plan'}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </Section>

      <Section id="testimonials" className="tint stories-section">
        <Heading data={testimonials} />
        <div className="grid cols-3">
          {testimonials.items.map((item) => (
            <article className="story-card" key={item.title}>
              <span className="feature-mark" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p className="muted">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <section className="home-closing">
        <div className="container home-closing-inner">
          <div>
            <span className="home-closing-eyebrow">Make an informed next step</span>
            <h2>Explore your options with clarity.</h2>
            <p>Review plan details, then choose the next step that works for you.</p>
          </div>
          <div className="home-closing-actions">
            <Link className="btn solid lg" to="/register">Get started <span aria-hidden="true">→</span></Link>
            <Link className="home-closing-link" to="/faq">Read investment FAQs</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
