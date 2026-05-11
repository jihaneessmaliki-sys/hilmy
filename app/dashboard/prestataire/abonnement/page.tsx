import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'
import { PalierBadge } from '@/components/v2/PalierBadge'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { requirePrestataire } from '@/lib/supabase/session'
import { getEffectivePalier, isFounder } from '@/lib/permissions'
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

  // Source de vérité unique pour le palier affiché : `getEffectivePalier`
  // mappe les founders (is_founder = true) vers cercle_pro même si la colonne
  // `palier` en BDD vaut 'standard'. Lire `prestataire.palier` directement
  // ferait apparaître la mauvaise formule pour les founders.
  const palier: Palier = getEffectivePalier(prestataire)
  // Founder = accès Cercle Pro à vie sans abonnement Stripe. On adapte la
  // copie (prix, CTAs) en conséquence — pas d'upsell, pas de "résiliation".
  const isFounderUser = isFounder(prestataire)

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

  // Support prioritaire Cercle Pro : préfixe [PRIORITAIRE Cercle Pro] +
  // nom prestataire dans le subject mailto, SLA 12h vs 24h, style CTA
  // distinct (or pleine, emoji 💚) pour rendre la promesse visible.
  const isCerclePro = palier === 'cercle_pro'
  const supportSubject = isCerclePro
    ? `[PRIORITAIRE Cercle Pro] ${prestataire.nom} — Mon abonnement Hilmy`
    : `${prestataire.nom} — Mon abonnement Hilmy`
  const supportMailto = `mailto:hilmy.io@hotmail.com?subject=${encodeURIComponent(supportSubject)}`
  const supportSla = isCerclePro
    ? 'on te répond par email sous 12h ouvrées (support prioritaire Cercle Pro)'
    : 'on te répond par email sous 24h ouvrées'

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
            <span className="overline text-or">
              {isFounderUser ? 'Ton statut' : 'Ce que tu paies'}
            </span>
          </div>
          {isFounderUser ? (
            <>
              <p className="mt-4 font-serif text-[40px] font-light leading-[1.05] text-vert md:text-[48px]">
                Cercle Pro à vie
              </p>
              <p className="mt-2 text-[12px] italic text-texte-sec">
                En tant que founder Hilmy, tu accèdes à toutes les fonctionnalités
                Cercle Pro gratuitement, sans limite de durée. 💚
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="font-serif text-[48px] font-light leading-none text-vert md:text-[56px]">
                  {monthlyPrice}€
                </span>
                <span className="text-sm text-texte-sec">/ mois</span>
              </p>
              <p className="mt-2 text-[12px] italic text-texte-sec">
                Sans engagement de durée. Tu peux résilier à tout moment.
              </p>
            </>
          )}

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

        {/* Card 2 — Upsell, message founder, ou message Cercle Pro */}
        {/* Note : pour les founders, `palier` vaut toujours 'cercle_pro' via
            getEffectivePalier → la branche upsell ne se déclenche pas, on
            tombe directement sur le bloc founder/sommet. */}
        {isFounderUser ? (
          <div className="relative overflow-hidden rounded-sm bg-vert p-8 text-creme md:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-or/15 blur-3xl"
            />
            <div className="relative">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">Founder Hilmy</span>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-light italic text-or">
                Tu as Cercle Pro à vie en tant que founder Hilmy 💚
              </h2>
              <p className="mt-3 text-[14px] leading-[1.65] text-creme/85">
                Toutes les fonctionnalités Cercle Pro, sans abonnement, sans
                date de fin. C&apos;est notre façon de remercier celles qui
                nous ont fait confiance les premières.
              </p>
              <p className="mt-4 text-[13px] leading-[1.6] text-creme/75">
                Les nouvelles fonctionnalités te sont ajoutées en priorité,
                sans surcoût.
              </p>
            </div>
          </div>
        ) : upsell && upsellInfo && upsellPrice !== null ? (
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
          {isCerclePro && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-or/15 px-3 py-1 text-[10px] font-medium tracking-[0.22em] text-or-deep uppercase">
              <span className="text-or" aria-hidden="true">★</span>
              Support prioritaire
            </span>
          )}
        </div>
        <h2 className="mt-4 font-serif text-2xl font-light text-vert">
          {isFounderUser ? 'Une question, un besoin ?' : 'Tu veux changer ou résilier ?'}
        </h2>
        {isFounderUser ? (
          <p className="mt-4 max-w-2xl text-[14px] leading-[1.7] text-texte">
            Ton accès Cercle Pro est offert à vie — pas d&apos;abonnement à
            gérer ni à résilier. Pour toute question, écris à{' '}
            <a
              href={supportMailto}
              className="text-or-deep underline-offset-4 hover:text-or hover:underline"
            >
              hilmy.io@hotmail.com
            </a>
            , {supportSla}.
          </p>
        ) : (
          <>
            <p className="mt-4 max-w-2xl text-[14px] leading-[1.7] text-texte">
              Tu peux changer de palier ou arrêter ton abonnement à tout moment, en
              écrivant à{' '}
              <a
                href={supportMailto}
                className="text-or-deep underline-offset-4 hover:text-or hover:underline"
              >
                hilmy.io@hotmail.com
              </a>
              . La résiliation prend effet à la fin de ta période en cours, sans
              remboursement prorata. Aucune commission n&apos;est prélevée sur tes
              prestations — seul l&apos;abonnement plat te lie à Hilmy.
            </p>
            <p className="mt-4 max-w-2xl text-[12px] italic leading-[1.65] text-texte-sec">
              La gestion en self-service depuis le dashboard arrive bientôt. En
              attendant, {supportSla}.
            </p>
          </>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          {!isFounderUser && (
            <Link
              href="/tarifs"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
            >
              Comparer les paliers
              <span className="text-or-light" aria-hidden="true">→</span>
            </Link>
          )}
          <a
            href={supportMailto}
            className={
              isCerclePro
                ? 'inline-flex h-11 items-center gap-2 rounded-full bg-or px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:-translate-y-0.5 hover:bg-or-light hover:shadow-[0_8px_24px_rgba(201,169,97,0.3)]'
                : 'inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep'
            }
          >
            {isCerclePro ? (
              <>
                Contacter le support prioritaire 💚
                <span aria-hidden="true">→</span>
              </>
            ) : (
              <>
                Écrire à la team
                <span className="text-or" aria-hidden="true">→</span>
              </>
            )}
          </a>
        </div>
      </div>

      {/* Footer reassurance */}
      <p className="mt-12 text-center font-sans text-[12px] italic text-texte-sec">
        {isFounderUser
          ? 'Founder Hilmy · Cercle Pro à vie · Pas de commission sur tes prestations'
          : 'Pas de commission sur tes prestations · Sans engagement minimum · Résiliation libre'}
      </p>
    </section>
  )
}
