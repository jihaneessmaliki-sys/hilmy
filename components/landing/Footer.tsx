import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <div className="logo">HILMY</div>
          <div className="tagline">Le carnet d&apos;adresses qu&apos;on se passe entre copines.</div>
        </div>
        <div className="footer-col">
          <h4>Découvrir</h4>
          <ul>
            <li><a href="#histoire">Notre histoire</a></li>
            <li><a href="#categories">Nos catégories</a></li>
            <li><a href="#journal">Le journal</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Participer</h4>
          <ul>
            <li><Link href="/recommander">Recommander</Link></li>
            <li><Link href="/inscription">Rejoindre</Link></li>
            <li><Link href="/connexion">Connexion</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Maison</h4>
          <ul>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/mentions-legales">Mentions légales</Link></li>
            <li><Link href="/confidentialite">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <div>&copy; HILMY 2026, Genève</div>
        <div>Suisse, France, Belgique, Luxembourg, Monaco</div>
      </div>
    </footer>
  );
}
