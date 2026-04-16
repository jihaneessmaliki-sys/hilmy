import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay" />
      <div className="hero-content">
        <span className="eyebrow">Suisse &middot; France &middot; Belgique &middot; Luxembourg &middot; Monaco</span>
        <h1>Le carnet d&apos;adresses<br />qu&apos;on se passe entre <em>copines</em>.</h1>
        <p>Une coiffeuse au top, une p&eacute;diatre humaine, un brunch qui vaut le d&eacute;tour. HILMY rassemble les bonnes adresses recommand&eacute;es par 4&nbsp;800 femmes francophones.</p>
        <Link href="/inscription" className="btn btn-on-dark">Rejoindre HILMY</Link>
        <div className="hero-stats">
          <div><strong>1&nbsp;200+</strong> adresses</div>
          <div><strong>4&nbsp;800</strong> copines</div>
          <div><strong>5 pays</strong> francophones</div>
        </div>
      </div>
    </section>
  );
}
