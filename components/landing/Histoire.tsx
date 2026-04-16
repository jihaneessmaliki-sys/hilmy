import Link from "next/link";

export function Histoire() {
  return (
    <section className="editorial" id="histoire">
      <div className="histoire-grid">
        <div className="histoire-img" role="img" aria-label="Photo éditoriale HILMY" />
        <div className="histoire-content">
          <span className="eyebrow">Notre histoire</span>
          <h2>On en avait marre de chercher pendant des heures.</h2>
          <hr className="histoire-rule" />
          <p>
            <span className="dropcap">T</span>u as d&eacute;j&agrave; pass&eacute; une soir&eacute;e &agrave; scroller Google Maps pour trouver une esth&eacute;ticienne qui te tienne la conversation sans te juger. Une orthophoniste qui prend ta fille &agrave; l&apos;oreille. Un restaurant pour le brunch de samedi sans &ecirc;tre d&eacute;&ccedil;ue. On conna&icirc;t.
          </p>
          <p>
            Les meilleures adresses, on se les passe entre nous. Sur WhatsApp, en sortant de l&apos;&eacute;cole, devant un caf&eacute;. HILMY rassemble enfin tout &ccedil;a en un seul endroit, valid&eacute; par de vraies femmes qui vivent en Suisse, en France, en Belgique, au Luxembourg et &agrave; Monaco. Pas d&apos;algorithme bizarre, pas de pub d&eacute;guis&eacute;e. Juste des recommandations entre nous.
          </p>
          <Link href="/manifeste" className="btn-link">Lire le manifeste</Link>
        </div>
      </div>
    </section>
  );
}
