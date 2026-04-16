import Link from "next/link";

const articles = [
  {
    slug: "medecin-femme-geneve",
    meta: "Santé · 8 min",
    title: "Trouver une médecin femme à Genève sans y passer la nuit",
    desc: "Notre annuaire des praticiennes recommandées par les Genevoises, par spécialité et par quartier. Tu nous remercieras.",
    gradient: "linear-gradient(135deg, #C9B8A0 0%, #9E8A72 100%)",
  },
  {
    slug: "choisir-pediatre-jeune-maman",
    meta: "Maternité · 6 min",
    title: "Choisir sa pédiatre quand on est jeune maman",
    desc: "Les bonnes questions à poser, les signaux qui rassurent, et les pédiatres préférées des mamans en Suisse romande.",
    gradient: "linear-gradient(135deg, #B8A88E 0%, #8A7660 100%)",
  },
  {
    slug: "coiffeuses-bio-lausanne",
    meta: "Beauté · 5 min",
    title: "Les meilleures coiffeuses bio de Lausanne",
    desc: "Cinq adresses qui prennent soin de tes cheveux et de la planète, testées et validées par les Lausannoises de la communauté.",
    gradient: "linear-gradient(135deg, #D0BFA8 0%, #A89478 100%)",
  },
];

export function Journal() {
  return (
    <section className="editorial" id="journal">
      <div className="section-header">
        <span className="eyebrow">Le journal</span>
        <h2>Des lectures qui te <em>servent vraiment</em>.</h2>
        <p>Des conseils pratiques, pas du blabla. Tout ce qu&apos;on aurait aimé qu&apos;une copine nous dise plus tôt, écrit par celles qui ont testé pour de vrai.</p>
      </div>
      <div className="journal-grid">
        {articles.map((article) => (
          <article key={article.slug} className="article-card">
            <div className="article-img" style={{ background: article.gradient }} />
            <div className="article-meta">{article.meta}</div>
            <h3>{article.title}</h3>
            <p>{article.desc}</p>
            <Link href={`/journal/${article.slug}`} className="btn-link">Lire l&apos;article</Link>
          </article>
        ))}
      </div>
      <div className="journal-cta">
        <Link href="/journal" className="btn-link" style={{ borderBottomColor: "var(--green-deep)" }}>Tous les articles</Link>
      </div>
    </section>
  );
}
