import Link from 'next/link'
import type { Metadata } from 'next'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { requireUserProfile } from '@/lib/supabase/session'
import { createClient } from '@/lib/supabase/server'
import {
  listActivePerks,
  listMyClaims,
  type ActivePerkWithPrestataire,
} from '@/lib/supabase/queries/pro-perks'
import type { ProPerkClaim } from '@/lib/supabase/types'
import { PerkClaimButton } from './_components/PerkClaimButton'

export const metadata: Metadata = {
  title: 'Tes avantages Copine',
}

function discountLabel(perk: ActivePerkWithPrestataire): string {
  return perk.discount_type === 'percentage'
    ? `${perk.discount_value} % de réduction`
    : `${perk.discount_value} € de réduction`
}

function formatEndsAt(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `Valable jusqu'au ${new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)}`
}

export default async function UtilisatriceAvantagesPage() {
  // requireUserProfile gère déjà l'auth + redirect onboarding ;
  // on ne fetch is_copine que pour adapter UX (claim vs teasing).
  const { user } = await requireUserProfile()
  const supabase = await createClient()
  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('is_copine')
    .eq('user_id', user.id)
    .maybeSingle()
  const isCopine = profileRow?.is_copine ?? false

  const { data: perks } = await listActivePerks()
  const list = (perks ?? []) as ActivePerkWithPrestataire[]

  // Claims existants — pour afficher "Déjà claim → code XXXX" sans
  // refaire un POST. Skip pour les non-Copines (RLS retournera [] de
  // toute façon, mais on évite le round-trip).
  let claimsByPerkId = new Map<string, ProPerkClaim>()
  if (isCopine) {
    const { data: claims } = await listMyClaims()
    claimsByPerkId = new Map(
      ((claims ?? []) as ProPerkClaim[]).map((c) => [c.perk_id, c]),
    )
  }

  return (
    <div className="min-h-screen bg-creme">
      <DashboardHeader
        kicker={isCopine ? 'Tes avantages Copine' : 'Les avantages Copine'}
        titre={
          isCopine ? (
            <>
              Tes <span className="italic text-or">avantages Copine</span>
            </>
          ) : (
            <>
              Les <span className="italic text-or">avantages Copine</span>
            </>
          )
        }
        lead={
          isCopine
            ? "Les pros qu'on adore te font des prix. Profites-en."
            : 'Les Copines ont des réductions chez les pros. Rejoins-les pour en profiter.'
        }
        actions={
          isCopine ? undefined : (
            <Link
              href="/pass-copine"
              className="inline-flex items-center justify-center rounded-full bg-or px-6 py-3 text-[12px] font-semibold tracking-[0.18em] text-vert uppercase transition-colors hover:bg-or-light"
            >
              Je prends mon Pass
            </Link>
          )
        }
      />
      <section className="px-6 py-10 md:px-12 md:py-14">
        {list.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-md border border-or/20 bg-white p-10 text-center">
            <GoldLine className="mx-auto" width={48} />
            <p className="mt-6 font-serif text-[22px] font-light italic text-vert">
              Bientôt des offres ici.
            </p>
            <p className="mt-3 text-[14px] text-texte-sec">
              Les prestataires Cercle Pro lancent leurs premières offres
              — repasse vite.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {list.map((perk) => {
              const existingClaim = claimsByPerkId.get(perk.id)
              const endsLabel = formatEndsAt(perk.ends_at)
              return (
                <li
                  key={perk.id}
                  className="flex h-full flex-col rounded-md border border-or/20 bg-white p-6 md:p-8"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full bg-or/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.22em] text-or-deep uppercase">
                      {discountLabel(perk)}
                    </span>
                    {perk.prestataire?.categorie && (
                      <span className="text-[11px] tracking-[0.18em] text-texte-sec uppercase">
                        {perk.prestataire.categorie}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-serif text-[22px] font-light leading-tight text-vert">
                    {perk.title}
                  </h3>
                  {perk.prestataire && (
                    <p className="mt-1 text-[12px] tracking-[0.18em] text-or-deep uppercase">
                      {perk.prestataire.nom}
                      {perk.prestataire.ville
                        ? ` · ${perk.prestataire.ville}`
                        : ''}
                    </p>
                  )}
                  {perk.description && (
                    <p className="mt-3 text-[14px] leading-[1.65] text-texte-sec">
                      {perk.description}
                    </p>
                  )}
                  {perk.conditions && (
                    <p className="mt-3 text-[12px] italic leading-[1.6] text-texte-sec">
                      Conditions : {perk.conditions}
                    </p>
                  )}
                  {endsLabel && (
                    <p className="mt-2 text-[11px] tracking-[0.18em] text-texte-sec uppercase">
                      {endsLabel}
                    </p>
                  )}
                  <div className="mt-auto pt-6">
                    <PerkClaimButton
                      perkId={perk.id}
                      isCopine={isCopine}
                      initialClaim={existingClaim ?? null}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
