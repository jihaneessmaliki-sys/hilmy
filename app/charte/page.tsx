import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { GoldLine } from '@/components/ui/GoldLine'

export default function ChartePage() {
  return (
    <ContentPageShell
      kicker="Ce qui nous lie"
      titre={
        <>
          Notre{' '}
          <em className="font-serif italic text-or">charte de confiance.</em>
        </>
      }
      lead={
        <>
          Hilmy n&apos;est pas un site comme les autres. C&apos;est un endroit où on se
          fait confiance entre femmes. Cette charte, c&apos;est notre pacte&nbsp;:
          simple, clair, sincère.
        </>
      }
    >
      <div className="grid max-w-3xl gap-12">
        <CharteItem numero="01" titre="Confiance vérifiée">
          <p>
            Chaque fiche prestataire est relue à la main par notre équipe avant
            d&apos;être visible dans l&apos;annuaire. On ne laisse rien passer au
            hasard — on prend le temps de vérifier les coordonnées, la cohérence
            de l&apos;offre, le ton.
          </p>
          <p>
            Si quelque chose te semble bizarre, tu peux signaler une fiche en un
            clic. On traite chaque alerte avec sérieux et discrétion.
          </p>
        </CharteItem>

        <CharteItem numero="02" titre="100 % entre femmes">
          <p>
            Hilmy s&apos;adresse aux femmes — utilisatrices et prestataires.
            En t&apos;inscrivant, tu confirmes sur l&apos;honneur être une femme.
            C&apos;est notre force&nbsp;: ici, on est entre nous.
          </p>
          <p>
            On se comprend, on se soutient, on se recommande les yeux fermés.
            Ce cadre nous permet d&apos;être plus libres, plus précises, plus
            généreuses dans ce qu&apos;on partage.
          </p>
        </CharteItem>

        <CharteItem numero="03" titre="Bienveillance, toujours">
          <p>
            On se passe les bonnes adresses, pas les coups bas. Pas de commentaires
            méchants, pas de jugements faciles. Si on n&apos;est pas satisfaite
            d&apos;une prestation, on en parle avec respect — et la prestataire
            peut répondre publiquement.
          </p>
          <p>
            Les prestataires mettent leur talent et leur cœur dans ce qu&apos;elles
            font. On honore ça.
          </p>
        </CharteItem>

        <CharteItem numero="04" titre="Gratuité réelle">
          <p>
            Hilmy est gratuit. Pour les utilisatrices comme pour les prestataires.
            On ne prend pas de commission sur les prestations, on ne vend pas tes
            données, on ne pousse pas de fiches contre paiement.
          </p>
          <p>
            Notre seul rôle, c&apos;est de connecter les copines entre elles —
            point.
          </p>
        </CharteItem>

        <CharteItem numero="05" titre="Tes données t'appartiennent">
          <p>
            Données hébergées en Europe, conformes RGPD et nLPD suisse.
            Tu peux à tout moment exporter ce qu&apos;on a sur toi, suspendre ton
            compte ou demander la suppression. Aucune revente à des tiers, jamais.
          </p>
        </CharteItem>
      </div>
    </ContentPageShell>
  )
}

function CharteItem({
  numero,
  titre,
  children,
}: {
  numero: string
  titre: string
  children: React.ReactNode
}) {
  return (
    <article className="rounded-sm border border-or/15 bg-blanc p-8 md:p-10">
      <div className="flex items-baseline gap-4">
        <span className="font-serif text-3xl italic text-or">{numero}</span>
        <div className="flex items-center gap-3">
          <GoldLine width={20} />
          <h2 className="font-serif text-[clamp(1.25rem,2.5vw,1.5rem)] font-light text-vert">
            {titre}
          </h2>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-[15px] leading-[1.8] text-texte">
        {children}
      </div>
    </article>
  )
}
