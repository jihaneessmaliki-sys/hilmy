import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'
import { PalierBadge } from '@/components/v2/PalierBadge'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { requirePrestataire } from '@/lib/supabase/session'
import {
  PALIER_INFO,
  PRICING,
  type Palier,
} from '@/app/tarifs/_lib/pricing'

const NEXT_PALIER: Record<Palier, Palier | null> = {
  standard: 'premium',
  premium: 'cercle_pro',
  cercle_pro: null,
}

export default async function AbonnementPage() {
  const { prestataire } = await requirePrestataire()

  const palier: Palier =
    prestataire.palier === 'premium'
      ? 'premium'
      : prestataire.palier === 'cercle_pro'
        ? 'cercle_pro'
        : 'standard'

  const info = PALIER_INFO[palier]
  const monthlyPrice = PRICING[palier][1].m

  const actifDepuis = new Date(
    prestataire.approved_at ?? prestataire.created_at,
  ).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })

  const upsell = NEXT_PALIER[palier]
  const upsellInfo = upsell ? PALIER_INFO[upsell] : null
  const upsellPrice = upsell ? PRICING[upsell][1].m : null

  return (
    <section className="px-6 py-12 md:px-12 md:py-16">
      {/* En-tête */}
      <div className="flex flex-col gap-6 border-b border-or/15 pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="overline text-or">Ton abonnement</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05] text-vert">
            Formule{' '}
            <em className="italic text-or">{info.name}</em>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-[1.65] text-texte-sec">
            {info.tagline}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          <div className="flex items-center gap-3">
            {palier === 'cercle_pro' && <PastilleSelectionHilmy />}
            <PalierBadge palier={palier} size="medium" />
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-or/40 bg-or/10 px-4 py-2 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-or" aria-hidden="true" />
            Actif depuis {actifDepuis}
          </span>
        </div>
      </div>

      {/* Récap prix + features */}
      <div className="mt-10 grid gap-5 md:grid-cols-[1.1fr_1fr]">
        {/* Card 1 — Prix actuel + features */}
        <div className="rounded-sm border border-or/20 bg-creme-soft p-8 md:p-10">
          <div className="flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">Ce que tu paies</span>
          </div>
          <p className="mt-4 flex items-baseline gap-1.5">
            <span className="font-serif text-[48px] font-light leading-none text-vert md:text-[56px]">
              {monthlyPrice}€
            </span>
            <span className="text-sm text-texte-sec">/ mois</span>
          </p>
          <p className="mt-2 text-[12px] italic text-texte-sec">
            Sans engagement de durée. Tu peux résilier à tout moment.
          </p>

          <h2 className="mt-8 font-serif text-xl font-light text-vert">
            Inclus dans ton palier&nbsp;:
          </h2>
          <ul className="mt-5 space-y-3 text-[14px] leading-[1.55] text-texte">
            {info.features.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-or/40 bg-blanc text-[11px] text-or"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Card 2 — Upsell ou message Cercle Pro */}
        {upsell && upsellInfo && upsellPrice !== null ? (
          <div className="relative overflow-hidden rounded-sm bg-vert p-8 text-creme md:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-or/15 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">Passer au palier suivant</span>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-light italic text-or">
                Formule {upsellInfo.name}
              </h2>
              <p className="mt-2 text-[14px] leading-[1.55] text-creme/85">
                {upsellInfo.tagline}
              </p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-serif text-[36px] font-light leading-none text-or">
                  {upsellPrice}€
                </span>
                <span className="text-sm text-creme/70">/ mois</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-[13px] leading-[1.55]">
                {upsellInfo.features.slice(0, 5).map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-or"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/tarifs"
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-full border border-or/60 bg-or/10 px-5 text-[11px] font-medium tracking-[0.22em] text-or-light uppercase transition-all hover:border-or hover:bg-or/20"
              >
                Voir le détail des paliers
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-sm bg-vert p-8 text-creme md:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-or/15 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">Le palier le plus complet</span>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-light italic text-or">
                Tu es au sommet du carnet.
              </h2>
              <p className="mt-3 text-[14px] leading-[1.65] text-creme/85">
                Le Cercle Pro inclut tout ce qu&apos;on propose aujourd&apos;hui.
                Les nouvelles fonctionnalités te seront ajoutées en priorité,
                sans surcoût.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gestion abonnement */}
      <div className="mt-10 rounded-sm border border-or/20 bg-blanc p-8 md:p-10">
        <div className="flex items-center gap-4">
          <GoldLine width={40} />
          <span className="overline text-or">Gestion</span>
        </div>
        <h2 className="mt-4 font-serif text-2xl font-light text-vert">
          Tu veux changer ou résilier&nbsp;?
        </h2>
        <p className="mt-4 max-w-2xl text-[14px] leading-[1.7] text-texte">
          Tu peux changer de palier ou arrêter ton abonnement à tout moment, en
          écrivant à{' '}
          <a
            href="mailto:hello@hilmy.io?subject=Mon%20abonnement%20Hilmy"
            className="text-or-deep underline-offset-4 hover:text-or hover:underline"
          >
            hello@hilmy.io
          </a>
          . La résiliation prend effet à la fin de ta période en cours, sans
          remboursement prorata. Aucune commission n&apos;est prélevée sur tes
          prestations — seul l&apos;abonnement plat te lie à Hilmy.
        </p>
        <p className="mt-4 max-w-2xl text-[12px] italic leading-[1.65] text-texte-sec">
          La gestion en self-service depuis le dashboard arrive bientôt. En
          attendant, on te répond par email sous 24h ouvrées.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/tarifs"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
          >
            Comparer les paliers
            <span className="text-or-light" aria-hidden="true">→</span>
          </Link>
          <a
            href="mailto:hello@hilmy.io?subject=Mon%20abonnement%20Hilmy"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep"
          >
            Écrire à la team
            <span className="text-or" aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      {/* Footer reassurance */}
      <p className="mt-12 text-center font-sans text-[12px] italic text-texte-sec">
        Pas de commission sur tes prestations · Sans engagement minimum ·
        Résiliation libre
      </p>
    </section>
  )
}
