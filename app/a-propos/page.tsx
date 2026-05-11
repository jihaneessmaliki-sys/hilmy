import type { Metadata } from 'next'
import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { GoldLine } from '@/components/ui/GoldLine'

export const metadata: Metadata = {
  title: 'À propos',
  description:
    "L'histoire de Hilmy, par Jihane sa fondatrice. Un annuaire de prestataires pour les femmes francophones, fait entre copines.",
  alternates: { canonical: '/a-propos' },
  openGraph: {
    title: 'À propos — Hilmy',
    description:
      "L'histoire de Hilmy, par Jihane sa fondatrice. Un annuaire de prestataires pour les femmes francophones, fait entre copines.",
    url: '/a-propos',
    siteName: 'Hilmy',
    locale: 'fr_FR',
    type: 'article',
    images: [{ url: '/images/hero.jpg', width: 1200, height: 630, alt: 'Hilmy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'À propos — Hilmy',
    description: "L'histoire de Hilmy, par Jihane sa fondatrice.",
    images: ['/images/hero.jpg'],
  },
}

export default function AProposPage() {
  return (
    <ContentPageShell
      kicker="Notre histoire"
      titre={
        <>
          Une histoire
          <br />
          <em className="font-serif italic text-or">de copines.</em>
        </>
      }
      lead={
        <>
          Tu connais ce moment. Il est 23h, tu scrolles ton téléphone, et tu te
          demandes encore où aller te faire faire les sourcils ce mois-ci.
        </>
      }
    >
      <article className="mx-auto max-w-2xl space-y-12 font-sans text-[17px] leading-[1.75] text-vert">
        <section className="space-y-6">
          <p>
            Tu ouvres Instagram. Tu envoies trois DM à des copines. Tu attends.
            Demain peut-être, l&apos;une te répondra avec un nom de prestataire
            qui correspond <em className="italic">à peu près</em> à ce que tu
            cherches.
          </p>
          <p>
            Multiplie ça par les coiffeuses, les esthéticiennes, les
            photographes, les traiteurs, les lieux pour ton événement, les
            makeup artists, les nounous. Multiplie par tes copines qui te
            posent les mêmes questions. Par ta sœur, ta belle-sœur, ta
            meilleure amie d&apos;enfance.
          </p>
          <p>
            Toutes nos «&nbsp;bonnes adresses&nbsp;» dorment éparpillées dans
            des conversations WhatsApp, des stories sauvegardées, des notes
            iPhone qui s&apos;oublient.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <h2 className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light leading-tight text-or">
              Le déclic
            </h2>
          </div>
          <p>
            J&apos;en ai eu marre. Un jour, je me suis dit qu&apos;il devait y
            avoir mieux que ce ping-pong de DM. Qu&apos;on méritait toutes
            — nous les filles qui demandons, nous les prestataires qui
            répondons — un endroit où ça se passe simplement. Sans algorithme
            qui décide pour nous. Sans pub partout. Juste entre copines.
          </p>
          <p>
            J&apos;ai commencé à construire Hilmy. Pour les femmes
            francophones qui veulent arrêter de chercher la bonne adresse à
            l&apos;aveugle. Pour les prestataires talentueuses qui méritent
            qu&apos;on les voie autrement qu&apos;à coups d&apos;algos
            Instagram. Pour qu&apos;on s&apos;entraide vraiment.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <h2 className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light leading-tight text-or">
              Hilmy, c&apos;est quoi exactement
            </h2>
          </div>
          <p>
            Un annuaire de prestataires choisies. Des recommandations entre
            copines plutôt que des avis de robots. Des événements qui
            rassemblent. Et bientôt, plein d&apos;autres choses qui rendront
            la vie plus douce.
          </p>
          <p>
            Tu cherches une coiffeuse à Genève qui sait faire les cheveux
            bouclés ? Une make-up artist à Paris pour ton mariage civil ? Un
            lieu pour ton baby shower à Bruxelles ? Hilmy, c&apos;est
            l&apos;endroit où tu trouves — sans fouiller, sans DM, sans
            pression.
          </p>
          <p>
            Et si tu es prestataire toi-même, tu peux nous rejoindre côté
            annuaire. Tu existes pour de vrai sur Internet, pas juste dans une
            bio Insta qui disparaît dans le feed.
          </p>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <GoldLine width={32} />
            <h2 className="font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light leading-tight text-or">
              L&apos;invitation
            </h2>
          </div>
          <p>
            Hilmy en est encore à ses débuts, et c&apos;est ça qui rend
            l&apos;aventure belle. On la construit ensemble — toi, moi, les
            copines, les prestataires. Si tu veux nous rejoindre,
            t&apos;inscrire gratuitement, recommander une adresse qu&apos;on
            adore ou nous proposer ta fiche prestataire, je suis là.
          </p>
          <p>Bienvenue dans la team des bonnes adresses.</p>
        </section>

        <footer className="border-t border-or/30 pt-8">
          <p className="font-serif text-[19px] italic leading-relaxed text-vert">
            — Jihane, fondatrice Hilmy
          </p>
        </footer>
      </article>
    </ContentPageShell>
  )
}
