import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'

export const metadata: Metadata = {
  title: 'Tarifs prestataires — Hilmy',
  description:
    'Trois paliers pensés pour toi : Standard 19 €, Premium 49 €, Cercle Pro 99 €. Aucun engagement, mois par mois.',
}

const HELLO = 'hilmy.io@hotmail.com'

function mailto(tier: 'Standard' | 'Premium' | 'Cercle Pro') {
  const subject = `Inscription palier ${tier} Hilmy`
  return `mailto:${HELLO}?subject=${encodeURIComponent(subject)}`
}

type Feature = { label: string; emphasis?: boolean }

const STANDARD_FEATURES: Feature[] = [
  { label: 'Fiche complète sur l’annuaire' },
  { label: '9 canaux sociaux cliquables' },
  { label: 'Catégorie + ville + filtres' },
  { label: 'Recevoir et répondre aux avis Pass Copine' },
  { label: 'Compteur de vues mensuelles (total)' },
  { label: 'Newsletter prestataires' },
  { label: 'Badge « Prestataire Hilmy »' },
  { label: 'Jusqu’à 5 photos sur la fiche', emphasis: true },
]

const PREMIUM_FEATURES: Feature[] = [
  { label: 'Tout le palier Standard', emphasis: true },
  { label: 'Dashboard détaillé (vues / clics / contacts par jour, semaine, mois)' },
  { label: 'Tap-to-contact tracé (WhatsApp, tél, site)' },
  { label: 'Jusqu’à 20 photos + galerie organisée par catégorie' },
  { label: '1 vidéo de présentation (60 sec, vertical façon story)' },
  { label: 'Programme d’avantage Pass Copine (–10 % membres)' },
  { label: 'Stats hebdo par email automatique' },
  { label: 'Story IG Hilmy par trimestre' },
  { label: 'Boost saisonnier inclus 2× par an' },
]

const CERCLE_PRO_FEATURES: Feature[] = [
  { label: 'Tout le palier Premium', emphasis: true },
  { label: 'Vidéos illimitées sur la fiche (présentation, témoignages, before/after, démos, ambiance)' },
  { label: 'Photos illimitées' },
  { label: 'Carrousel vidéo en haut de fiche (3 premières en autoplay muet, façon TikTok)' },
  { label: 'Vidéos verticales et horizontales acceptées' },
  { label: 'Demande de devis express (formulaire intégré → email + SMS)' },
  { label: 'Mise en avant prioritaire (haut des résultats catégorie)' },
  { label: 'Pastille « Sélection Hilmy »' },
  { label: 'Apparition mensuelle dans la newsletter « Coups de cœur »' },
  { label: 'Portrait Sara par an (IG long + story)' },
  { label: 'Stats avancées (carte villes, pics horaires, benchmark catégorie)' },
  { label: 'Boost saisonnier illimité' },
  { label: 'Accès anticipé aux nouvelles features' },
  { label: 'Module « Mes recommandations » entre prestataires' },
]

const FAQ_ITEMS = [
  {
    q: 'Puis-je changer de palier ?',
    a: 'Oui, à tout moment. Tu nous écris, on bascule ta fiche le mois suivant — sans frais ni paperasse.',
  },
  {
    q: 'Engagement minimum ?',
    a: 'Aucun. C’est mois par mois. Tu testes, tu restes, tu pars : c’est toi qui décides.',
  },
  {
    q: 'Quand ma fiche est-elle visible ?',
    a: 'Dès validation par notre équipe, sous 48h ouvrées. On regarde chaque candidature à la main avant publication.',
  },
  {
    q: 'Est-ce que je peux essayer gratuitement ?',
    a: 'On t’invite à candidater librement. Si ta fiche est validée, tu démarres le mois où tu veux. Aucun paiement avant publication.',
  },
  {
    q: 'Quelle différence avec un annuaire classique ?',
    a: 'Hilmy, c’est une team de copines qui se recommandent. Ta fiche est animée par une vraie communauté de femmes — pas juste listée dans une base de données.',
  },
  {
    q: 'Comment se passe le paiement ?',
    a: 'Virement bancaire ou lien Stripe sur demande. La facture est émise par Hilmy après validation, et le paiement déclenche la mise en ligne.',
  },
]

export default function TarifsPage() {
  return (
    <PageShell navVariant="solid">
      {/* Hero */}
      <section className="relative overflow-hidden bg-creme pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="flex items-center gap-4">
              <GoldLine width={48} />
              <span className="overline text-or">Tarifs prestataires</span>
            </div>
            <h1 className="mt-6 max-w-3xl font-serif text-[clamp(2.25rem,5vw,4rem)] font-light leading-[1.05] text-vert">
              Rejoins l&apos;annuaire des{' '}
              <em className="font-serif italic text-or">bonnes adresses.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-[16px] leading-[1.7] text-texte md:text-[18px]">
              Trois paliers pensés pour toi. Choisis celui qui te ressemble.
              Reste maîtresse de ton image et de ta visibilité dans la team.
            </p>
            <p className="mt-3 max-w-2xl text-[13px] italic text-texte-sec">
              Mois par mois — aucun engagement. Tu changes ou tu pars quand tu veux.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* 3 cards */}
      <section className="bg-creme pb-20 md:pb-28">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-6 md:grid-cols-3 md:items-stretch md:gap-5 lg:gap-7">
            {/* STANDARD */}
            <FadeInSection delay={0.05}>
              <TierCard
                emoji="🌿"
                tier="Standard"
                price="19"
                tagline="Pour démarrer proprement et exister dans le carnet."
                features={STANDARD_FEATURES}
                cta="Discuter de mon inscription"
                href={mailto('Standard')}
                variant="standard"
              />
            </FadeInSection>

            {/* PREMIUM — middle, highlighted */}
            <FadeInSection delay={0.1}>
              <TierCard
                emoji="💛"
                tier="Premium"
                price="49"
                tagline="Pour celles qui veulent piloter leur visibilité finement."
                features={PREMIUM_FEATURES}
                cta="Discuter de mon inscription"
                href={mailto('Premium')}
                variant="premium"
                badge="Le plus choisi"
              />
            </FadeInSection>

            {/* CERCLE PRO — dark, golden accents */}
            <FadeInSection delay={0.15}>
              <TierCard
                emoji="⭐"
                tier="Cercle Pro"
                price="99"
                tagline="Pour les prestataires qui veulent rayonner et faire team."
                features={CERCLE_PRO_FEATURES}
                cta="Discuter de mon inscription"
                href={mailto('Cercle Pro')}
                variant="cercle"
              />
            </FadeInSection>
          </div>

          <p className="mt-10 text-center text-[12px] italic text-texte-sec">
            Tarifs en euros, TTC. Hilmy n&apos;encaisse aucune commission sur tes prestations.
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-blanc py-20 md:py-28">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="flex items-center gap-5">
              <span className="font-serif text-[44px] font-light leading-none text-or">
                02
              </span>
              <GoldLine width={60} />
              <span className="overline text-or">Comment ça marche</span>
            </div>
            <h2 className="mt-6 max-w-2xl font-serif text-[clamp(1.875rem,3vw,2.75rem)] font-light leading-[1.15] text-vert">
              Trois étapes,{' '}
              <em className="font-serif italic text-or">faites à la main.</em>
            </h2>
          </FadeInSection>

          <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
            {[
              {
                n: '01',
                t: 'Tu choisis ton palier.',
                p: 'Tu cliques sur le CTA de la card qui te correspond et tu nous écris. Une vraie personne te lit.',
              },
              {
                n: '02',
                t: 'On valide ta fiche.',
                p: 'Notre équipe regarde chaque candidature à la main et te répond sous 48h. Qualité avant tout.',
              },
              {
                n: '03',
                t: 'Tu reçois ton lien.',
                p: 'Lien de paiement par virement ou Stripe sur demande. Ta fiche est mise en ligne dès réception.',
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-5">
                <span className="shrink-0 font-serif text-[40px] font-light italic leading-none text-or">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-serif text-[20px] italic text-vert md:text-[22px]">
                    {step.t}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-texte-sec md:text-[15px]">
                    {step.p}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Quote / Manifesto bridge */}
      <section className="bg-vert py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 text-center md:px-20">
          <FadeInSection>
            <div className="flex justify-center">
              <GoldLine width={48} />
            </div>
            <p className="mt-8 font-serif text-[clamp(1.5rem,3vw,2.25rem)] font-light italic leading-[1.4] text-creme">
              « Tu ne paies pas une visibilité. Tu rejoins une team
              de copines qui se passent les bonnes adresses, pour de vrai. »
            </p>
            <p className="mt-8 text-[11px] tracking-[0.22em] text-or-light uppercase">
              — L&apos;équipe Hilmy
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-blanc py-20 md:py-28">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-12 md:grid-cols-[400px_1fr] md:gap-20">
            <FadeInSection>
              <div className="md:sticky md:top-32">
                <div className="flex items-center gap-5">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    03
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">Tu te demandes</span>
                </div>
                <h2 className="mt-6 font-serif text-[clamp(1.875rem,3vw,2.75rem)] font-light leading-[1.15] text-vert">
                  On répond,{' '}
                  <em className="font-serif italic text-or">sans détour.</em>
                </h2>
                <p className="mt-6 text-[14px] leading-[1.65] text-texte-sec">
                  Une autre question ?{' '}
                  <a
                    href={`mailto:${HELLO}`}
                    className="text-vert underline-offset-4 transition-colors hover:text-or hover:underline"
                  >
                    {HELLO}
                  </a>
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <div className="border-t border-or/30">
                {FAQ_ITEMS.map((faq, i) => (
                  <details
                    key={i}
                    className="group border-b border-or/30 py-5"
                    {...(i === 0 ? { open: true } : {})}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-6 py-1 text-left transition-colors hover:text-or [&::-webkit-details-marker]:hidden">
                      <h3 className="text-[15px] font-medium text-vert md:text-[17px]">
                        {faq.q}
                      </h3>
                      <span
                        aria-hidden="true"
                        className="shrink-0 font-serif text-[22px] font-light text-or transition-transform duration-300 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 pb-2 text-[14px] leading-[1.75] text-texte-sec md:pr-12 md:text-[15px]">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-creme-deep py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center md:px-20">
          <FadeInSection>
            <div className="flex justify-center">
              <GoldLine width={40} />
            </div>
            <h2 className="mt-6 font-serif text-[clamp(1.875rem,3.5vw,3rem)] font-light leading-[1.1] text-vert">
              Prête à rejoindre{' '}
              <em className="font-serif italic text-or">le carnet ?</em>
            </h2>
            <p className="mt-6 text-[15px] leading-[1.7] text-texte md:text-[16px]">
              Écris-nous en deux lignes. On te répond sous 48h, à la main,
              sans formulaire interminable.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={`mailto:${HELLO}?subject=${encodeURIComponent('Candidature prestataire Hilmy')}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-vert px-8 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
              >
                Écrire à Hilmy
                <span className="text-or-light" aria-hidden="true">→</span>
              </a>
              <Link
                href="/annuaire"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-or px-7 text-[12px] font-medium tracking-[0.22em] text-or-deep uppercase transition-all hover:bg-or/10"
              >
                Voir l&apos;annuaire
                <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="mt-8 text-[12px] italic text-texte-sec">
              <Link href="/" className="hover:text-or transition-colors">
                ← Retour à la home
              </Link>
            </p>
          </FadeInSection>
        </div>
      </section>
    </PageShell>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TierCard — composant local, pas réutilisé ailleurs.
   3 variants : standard (clair, neutre), premium (mis en avant,
   blanc relief + badge), cercle (dark vert, accents or).
   ───────────────────────────────────────────────────────────── */

interface TierCardProps {
  emoji: string
  tier: string
  price: string
  tagline: string
  features: Feature[]
  cta: string
  href: string
  variant: 'standard' | 'premium' | 'cercle'
  badge?: string
}

function TierCard({
  emoji,
  tier,
  price,
  tagline,
  features,
  cta,
  href,
  variant,
  badge,
}: TierCardProps) {
  // Charte par variant
  const isCercle = variant === 'cercle'
  const isPremium = variant === 'premium'

  const containerBase =
    'relative flex h-full flex-col rounded-sm border p-7 md:p-8 transition-all'
  const containerVariant = isCercle
    ? 'bg-vert border-or text-creme shadow-[0_30px_60px_-40px_rgba(15,61,46,0.5)]'
    : isPremium
      ? 'bg-blanc border-or shadow-[0_24px_50px_-30px_rgba(15,61,46,0.25)] md:scale-[1.03]'
      : 'bg-blanc border-or/20'

  const labelColor = isCercle ? 'text-or' : 'text-or'
  const titleColor = isCercle ? 'text-creme' : 'text-vert'
  const priceColor = isCercle ? 'text-creme' : 'text-vert'
  const taglineColor = isCercle ? 'text-creme/80' : 'text-texte-sec'
  const dividerColor = isCercle ? 'border-or/30' : 'border-or/20'
  const featureColor = isCercle ? 'text-creme/95' : 'text-texte'
  const checkColor = isCercle
    ? 'border-or bg-or text-vert'
    : isPremium
      ? 'border-or bg-or/15 text-or-deep'
      : 'border-vert/30 bg-creme-soft text-vert'

  const ctaClass = isCercle
    ? 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-or px-6 text-[12px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light'
    : isPremium
      ? 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-vert px-6 text-[12px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark'
      : 'inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-vert px-6 text-[12px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-vert hover:text-creme'

  return (
    <article className={`${containerBase} ${containerVariant}`}>
      {/* Badge "Le plus choisi" pour Premium */}
      {badge && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-or px-4 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-vert uppercase shadow-md">
          <span className="text-vert" aria-hidden="true">★</span>
          {badge}
        </span>
      )}

      {/* Couronne au-dessus de Cercle Pro */}
      {isCercle && (
        <span
          aria-hidden="true"
          className="absolute -top-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-or bg-vert text-[16px] text-or"
        >
          ★
        </span>
      )}

      {/* Header palier */}
      <header className="mt-1">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{emoji}</span>
          <span className={`overline ${labelColor}`}>{tier}</span>
        </div>
        <div className="mt-5 flex items-baseline gap-2">
          <span className={`font-serif text-[56px] font-light leading-none ${priceColor}`}>
            {price}
          </span>
          <span className={`font-serif text-[20px] font-light italic ${priceColor}`}>
            €
          </span>
          <span className={`text-[13px] ${taglineColor}`}>/mois</span>
        </div>
        <p className={`mt-4 font-serif text-[15px] italic leading-[1.5] ${taglineColor}`}>
          {tagline}
        </p>
      </header>

      <hr className={`mt-7 mb-6 border-t ${dividerColor}`} />

      {/* Features */}
      <ul className="space-y-3.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${checkColor}`}
              aria-hidden="true"
            >
              ✓
            </span>
            <span
              className={`text-[13.5px] leading-[1.55] ${featureColor} ${
                f.emphasis ? 'font-medium' : ''
              }`}
            >
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA pinned to bottom */}
      <div className="mt-auto pt-8">
        <a href={href} className={ctaClass}>
          {cta}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  )
}
