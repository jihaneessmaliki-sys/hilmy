import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { LegalSection } from '@/components/v2/LegalSection'

export default function CookiesPage() {
  return (
    <ContentPageShell
      kicker="Légal · Cookies"
      titre={
        <>
          Politique relative{' '}
          <em className="font-serif italic text-or">aux cookies.</em>
        </>
      }
      lead={<>Dernière mise à jour&nbsp;: avril 2026.</>}
    >
      <div className="grid max-w-3xl gap-10">
        <LegalSection numero="01" titre="Qu'est-ce qu'un cookie ?">
          <p>
            Un cookie est un petit fichier texte déposé sur votre navigateur
            lorsque vous visitez un site web. Il permet au site de se souvenir
            de certaines informations pour faciliter votre navigation.
          </p>
        </LegalSection>

        <LegalSection numero="02" titre="Cookies utilisés par Hilmy">
          <p>
            Hilmy utilise uniquement des cookies strictement nécessaires au
            fonctionnement du service&nbsp;:
          </p>
          <ul className="mt-3 space-y-2 pl-5">
            <li className="relative pl-1 before:absolute before:-left-4 before:top-[10px] before:h-1 before:w-1 before:rounded-full before:bg-or">
              <span className="font-medium text-vert">
                Cookie de session Supabase
              </span>{' '}
              — maintient votre connexion. Essentiel au fonctionnement de
              l&apos;authentification, ne peut pas être désactivé.
            </li>
          </ul>
        </LegalSection>

        <LegalSection numero="03" titre="Cookies tiers">
          <p>
            Hilmy n&apos;utilise aucun cookie de tracking, aucun cookie
            publicitaire et aucun service d&apos;analytics tiers. Nous ne
            collectons aucune donnée de navigation à des fins commerciales.
          </p>
        </LegalSection>

        <LegalSection numero="04" titre="Gestion des cookies">
          <p>
            Vous pouvez à tout moment configurer votre navigateur pour refuser
            les cookies. Veuillez noter que la désactivation du cookie de session
            empêchera l&apos;utilisation des fonctionnalités nécessitant une
            connexion.
          </p>
        </LegalSection>

        <LegalSection numero="05" titre="Contact">
          <p>
            Pour toute question relative aux cookies, écris-nous à{' '}
            <a
              href="mailto:hello@hilmy.io"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hello@hilmy.io
            </a>
            .
          </p>
        </LegalSection>
      </div>
    </ContentPageShell>
  )
}
