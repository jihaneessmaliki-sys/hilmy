import { ContentPageShell } from '@/components/v2/ContentPageShell'
import { GoldLine } from '@/components/ui/GoldLine'

export default function ContactPage() {
  return (
    <ContentPageShell
      kicker="Écris-nous"
      titre={
        <>
          On lit chaque message,{' '}
          <em className="font-serif italic text-or">vraiment.</em>
        </>
      }
      lead={
        <>
          Une question, un bug, une suggestion, une presta à signaler, une
          collaboration&nbsp;? Tout passe par cette boîte. On répond dans les
          48&nbsp;h ouvrées, parole d&apos;équipe.
        </>
      }
    >
      <div className="grid max-w-4xl gap-8 md:grid-cols-2">
        <ContactCard
          kicker="L'essentiel"
          titre="Email général"
          link="mailto:hello@hilmy.io"
          linkLabel="hello@hilmy.io"
          texte="Pour toute question produit, partenariat ou retour d'expérience."
        />

        <ContactCard
          kicker="Tu es prestataire"
          titre="Support prestataire"
          link="mailto:prestataires@hilmy.io"
          linkLabel="prestataires@hilmy.io"
          texte="Pour toute question sur ta fiche, ton dashboard ou la modération."
        />

        <ContactCard
          kicker="Une fiche pose problème"
          titre="Signaler"
          link="mailto:signalement@hilmy.io"
          linkLabel="signalement@hilmy.io"
          texte="Profil suspect, contenu déplacé, témoignage difficile — on traite chaque signalement avec discrétion."
        />

        <ContactCard
          kicker="Presse / partenariats"
          titre="Marque"
          link="mailto:marque@hilmy.io"
          linkLabel="marque@hilmy.io"
          texte="Demandes presse, partenariats éditoriaux, interventions, kit de marque."
        />
      </div>

      <div className="mt-16 rounded-sm border border-or/20 bg-blanc p-8 md:p-12">
        <div className="flex items-center gap-4">
          <GoldLine width={32} />
          <span className="overline text-or">L&apos;équipe</span>
        </div>
        <p className="mt-4 max-w-2xl font-serif text-[20px] italic leading-[1.55] text-vert md:text-[22px]">
          Hilmy est porté par une petite équipe basée à Genève. Pas de gros
          serveur de support, pas de chatbot — juste des humaines qui te lisent
          et te répondent.
        </p>
        <p className="mt-4 max-w-2xl text-[14px] leading-[1.75] text-texte-sec">
          On essaie de répondre dans les 48&nbsp;h ouvrées. Pour les sujets
          urgents (signalement de contenu inapproprié notamment), on priorise.
        </p>
      </div>
    </ContentPageShell>
  )
}

function ContactCard({
  kicker,
  titre,
  link,
  linkLabel,
  texte,
}: {
  kicker: string
  titre: string
  link: string
  linkLabel: string
  texte: string
}) {
  return (
    <article className="rounded-sm border border-or/15 bg-blanc p-8">
      <p className="overline text-or">{kicker}</p>
      <h2 className="mt-3 font-serif text-2xl font-light text-vert">{titre}</h2>
      <p className="mt-3 text-[14px] leading-[1.7] text-texte">{texte}</p>
      <a
        href={link}
        className="mt-5 inline-flex items-center gap-2 break-all text-[13px] font-medium text-or-deep underline-offset-4 hover:text-or hover:underline"
      >
        {linkLabel}
        <span aria-hidden="true">→</span>
      </a>
    </article>
  )
}
