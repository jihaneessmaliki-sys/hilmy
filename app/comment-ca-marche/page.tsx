import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import Link from 'next/link'

export default function CommentCaMarchePage() {
  return (
    <ContentPageShell
      kicker="Mode d'emploi"
      titre={
        <>
          Comment ça{' '}
          <em className="font-serif italic text-or">marche, concrètement.</em>
        </>
      }
      lead={
        <>
          On a voulu un produit simple&nbsp;: pas de jargon, pas d&apos;étapes
          inutiles, pas de promesses qu&apos;on ne tient pas. Voilà, en trois
          gestes de chaque côté.
        </>
      }
    >
      <div className="grid gap-16 md:grid-cols-2 md:gap-12">
        {/* Utilisatrice */}
        <section>
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Côté copine</span>
          </div>
          <h2 className="mt-4 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-vert">
            Tu cherches une prestataire ?
          </h2>

          <ol className="mt-8 space-y-8">
            <Step
              numero="01"
              titre="Inscris-toi"
              texte={
                <>
                  Email, mot de passe, prénom. Trente secondes, on te guide pour le
                  reste.
                </>
              }
            />
            <Step
              numero="02"
              titre="Explore l'annuaire"
              texte={
                <>
                  Filtre par catégorie, par ville, ou tape le nom direct. Chaque
                  fiche est vérifiée à la main avant d&apos;apparaître — c&apos;est
                  comme ça qu&apos;on garde la confiance.
                </>
              }
            />
            <Step
              numero="03"
              titre="Contacte-la directement"
              texte={
                <>
                  Tu as trouvé ta perle&nbsp;? Écris-lui sur WhatsApp ou Instagram
                  depuis sa fiche. Aucun intermédiaire, aucune commission — on te
                  laisse entre vous.
                </>
              }
            />
          </ol>
        </section>

        {/* Prestataire */}
        <section>
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <span className="overline text-or">Côté prestataire</span>
          </div>
          <h2 className="mt-4 font-serif text-[clamp(1.5rem,3vw,2rem)] font-light text-vert">
            Tu proposes un service ?
          </h2>

          <ol className="mt-8 space-y-8">
            <Step
              numero="01"
              titre="Crée ta fiche"
              texte={
                <>
                  Choisis ta méthode&nbsp;: depuis Google Places (2 minutes) ou en
                  remplissant toi-même (8 minutes). Tout est gratuit, et ça le
                  restera.
                </>
              }
            />
            <Step
              numero="02"
              titre="On la valide"
              texte={
                <>
                  Notre équipe relit chaque fiche avant publication. Si quelque
                  chose manque, on te fait des suggestions par email. C&apos;est la
                  garantie qu&apos;aucune mauvaise surprise n&apos;arrive aux
                  copines.
                </>
              }
            />
            <Step
              numero="03"
              titre="Les copines te trouvent"
              texte={
                <>
                  Ta fiche apparaît dans l&apos;annuaire. Les premières clientes
                  viennent, laissent leurs avis, et ton cercle s&apos;élargit. On
                  ne prélève rien sur tes prestations — jamais.
                </>
              }
            />
          </ol>
        </section>
      </div>

      <div className="mt-20 rounded-sm border border-or/20 bg-blanc p-8 md:p-12">
        <div className="flex items-center gap-4">
          <GoldLine width={32} />
          <span className="overline text-or">Envie de démarrer&nbsp;?</span>
        </div>
        <p className="mt-4 font-serif text-[20px] italic leading-[1.5] text-vert md:text-[24px]">
          Deux parcours, une seule promesse&nbsp;: entre femmes, tout est plus
          simple.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-vert px-7 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
          >
            Je rejoins les copines
            <span className="text-or-light" aria-hidden="true">
              →
            </span>
          </Link>
          <Link
            href="/onboarding/prestataire"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-or px-7 text-[12px] font-medium tracking-[0.22em] text-or-deep uppercase transition-all hover:bg-or/10"
          >
            Je propose mes services
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </ContentPageShell>
  )
}

function Step({
  numero,
  titre,
  texte,
}: {
  numero: string
  titre: string
  texte: React.ReactNode
}) {
  return (
    <li className="flex gap-5">
      <span className="shrink-0 font-serif text-3xl italic text-or">
        {numero}
      </span>
      <div>
        <h3 className="font-serif text-[18px] font-light italic text-vert">
          {titre}
        </h3>
        <p className="mt-1 text-[15px] leading-[1.75] text-texte">{texte}</p>
      </div>
    </li>
  )
}
