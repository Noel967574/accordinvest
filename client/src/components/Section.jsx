export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`section ${className}`}>
      <div className="container">{children}</div>
    </section>
  );
}

export function Heading({ data }) {
  return (
    <div className="section-head">
      <h2>{data.heading}</h2>
      {data.intro && <p className="muted">{data.intro}</p>}
    </div>
  );
}
