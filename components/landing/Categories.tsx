import Link from "next/link";

const categories = [
  { slug: "beaute", title: "Beauté", desc: "Coiffeuses, esthéticiennes, manucures" },
  { slug: "enfants", title: "Enfants", desc: "Pédiatres, nounous, activités" },
  { slug: "restaurants", title: "Restaurants", desc: "Brunchs, dîners, bonnes tables" },
  { slug: "bien-etre", title: "Bien-être", desc: "Spas, yoga, médecines douces" },
  { slug: "mode", title: "Mode", desc: "Boutiques, créatrices, retoucheuses" },
  { slug: "maison", title: "Maison", desc: "Décoratrices, artisans, fleuristes" },
  { slug: "evenementiel", title: "Événementiel", desc: "Wedding planners, traiteurs, photographes" },
  { slug: "droit-finances", title: "Droit & finances", desc: "Avocates, fiscalistes, courtières" },
  { slug: "sport-nature", title: "Sport & nature", desc: "Coachs, salles, sorties plein air" },
];

export function Categories() {
  return (
    <section className="editorial alt" id="categories">
      <div className="section-header">
        <span className="eyebrow">Nos catégories</span>
        <h2>Tout ce qu&apos;une copine <em>peut te dire</em>.</h2>
        <p>Neuf univers, des centaines d&apos;adresses recommandées par tes copines de toute la francophonie. Chaque catégorie s&apos;ouvre après ton inscription.</p>
      </div>
      <div className="categories-grid">
        {categories.map((cat) => (
          <Link key={cat.slug} href={`/categorie/${cat.slug}`} className="category-card">
            <h3>{cat.title}</h3>
            <p>{cat.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
