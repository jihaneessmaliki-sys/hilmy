export default function MentionsLegalesPage() {
  return (
    <>
      <h1 className="font-heading text-3xl md:text-4xl font-medium text-green-deep mb-8">
        Mentions légales
      </h1>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            Éditrice du site
          </h2>
          <p>
            Hilmy est édité par Jihane Maliki, entreprise individuelle
            domiciliée à Genève, Suisse.
          </p>
          <p className="mt-2">Contact : hello@hilmy.io</p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            Hébergement
          </h2>
          <p>
            Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133,
            Covina, CA 91723, États-Unis.
          </p>
          <p className="mt-2">
            Les données sont stockées par Supabase Inc., 970 Toa Payoh North
            #07-04, Singapore 318992.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            Propriété intellectuelle
          </h2>
          <p>
            L&apos;ensemble du contenu du site Hilmy (textes, graphismes, logo,
            images, mise en page) est la propriété exclusive de l&apos;éditrice,
            sauf mention contraire. Toute reproduction, même partielle, est
            interdite sans autorisation écrite préalable.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            Responsabilité
          </h2>
          <p>
            Hilmy est un annuaire de mise en relation. L&apos;éditrice ne saurait
            être tenue responsable de la qualité des prestations proposées par
            les prestataires référencées sur le site, ni des éventuels litiges
            entre utilisatrices et prestataires.
          </p>
        </section>
      </div>
    </>
  );
}
