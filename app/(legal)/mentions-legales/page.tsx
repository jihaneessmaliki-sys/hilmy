import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { LegalSection } from '@/components/v2/LegalSection'

export default function MentionsLegalesPage() {
  return (
    <ContentPageShell
      kicker="Légal · Mentions"
      titre={
        <>
          Mentions{' '}
          <em className="font-serif italic text-or">légales.</em>
        </>
      }
      lead={
        <>
          Les informations légales obligatoires sur l&apos;éditrice, l&apos;hébergement
          et la propriété intellectuelle.
        </>
      }
    >
      <div className="grid max-w-3xl gap-10">
        <LegalSection titre="Éditrice du site">
          <p>
            Hilmy est édité par Jihane Maliki, entreprise individuelle domiciliée
            à Genève, Suisse.
          </p>
          <p>
            Contact&nbsp;:{' '}
            <a
              href="mailto:hello@hilmy.io"
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hello@hilmy.io
            </a>
          </p>
        </LegalSection>

        <LegalSection titre="Hébergement">
          <p>
            Le site est hébergé par Vercel Inc., 440 N Barranca Ave&nbsp;#4133,
            Covina, CA&nbsp;91723, États-Unis.
          </p>
          <p>
            Les données sont stockées par Supabase Inc., 970 Toa Payoh North
            #07-04, Singapore&nbsp;318992.
          </p>
        </LegalSection>

        <LegalSection titre="Propriété intellectuelle">
          <p>
            L&apos;ensemble du contenu du site Hilmy (textes, graphismes, logo,
            images, mise en page) est la propriété exclusive de l&apos;éditrice,
            sauf mention contraire. Toute reproduction, même partielle, est
            interdite sans autorisation écrite préalable.
          </p>
        </LegalSection>

        <LegalSection titre="Responsabilité">
          <p>
            Hilmy est un annuaire de mise en relation. L&apos;éditrice ne saurait
            être tenue responsable de la qualité des prestations proposées par les
            prestataires référencées sur le site, ni des éventuels litiges entre
            utilisatrices et prestataires.
          </p>
        </LegalSection>
      </div>
    </ContentPageShell>
  )
}
