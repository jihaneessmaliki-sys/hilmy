export default function CookiesPage() {
  return (
    <>
      <h1 className="font-heading text-3xl md:text-4xl font-medium text-green-deep mb-8">
        Politique relative aux cookies
      </h1>

      <p className="text-muted-foreground leading-relaxed mb-8">
        Dernière mise à jour : avril 2026.
      </p>

      <div className="space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            1. Qu&apos;est-ce qu&apos;un cookie ?
          </h2>
          <p>
            Un cookie est un petit fichier texte déposé sur votre navigateur
            lorsque vous visitez un site web. Il permet au site de se souvenir
            de certaines informations pour faciliter votre navigation.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            2. Cookies utilisés par Hilmy
          </h2>
          <p>
            Hilmy utilise uniquement des cookies strictement nécessaires au
            fonctionnement du service :
          </p>
          <ul className="mt-2 list-disc pl-6 space-y-1">
            <li>
              <strong>Cookie de session Supabase</strong> : permet de maintenir
              votre connexion. Ce cookie est essentiel au fonctionnement de
              l&apos;authentification et ne peut pas être désactivé.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            3. Cookies tiers
          </h2>
          <p>
            Hilmy n&apos;utilise aucun cookie de tracking, aucun cookie
            publicitaire et aucun service d&apos;analytics tiers. Nous ne
            collectons aucune donnée de navigation à des fins commerciales.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            4. Gestion des cookies
          </h2>
          <p>
            Vous pouvez à tout moment configurer votre navigateur pour refuser
            les cookies. Veuillez noter que la désactivation du cookie de session
            empêchera l&apos;utilisation des fonctionnalités nécessitant une
            connexion.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-xl font-medium text-foreground mb-3">
            5. Contact
          </h2>
          <p>
            Pour toute question relative aux cookies, contactez-nous à
            hello@hilmy.io.
          </p>
        </section>
      </div>
    </>
  );
}
