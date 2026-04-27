import Link from 'next/link'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { GoldLine } from '@/components/ui/GoldLine'
import { HilmyButton } from '@/components/ui/HilmyButton'
import { getPionnieres } from '@/lib/supabase/queries/prestataires'
import { categoryLabel } from '@/lib/constants'
import type { Prestataire } from '@/lib/supabase/types'

// Bandeau prestataire aligné avec /tarifs (commit 923fd8c batch 3.2 brief tarifs).
// Anciens bullets "Aucun abonnement, aucune commission, jamais" retirés —
// contredisaient frontalement les paliers payants Standard/Premium/Cercle Pro.
const PROVIDER_VALUE_PROP = [
  'Validation sous 48h, par de vraies copines',
  'Trois formules, dès 19€/mois',
  "Pas d'engagement, tu pars quand tu veux",
  'Ton profil importé en 2 min (Google, Instagram, LinkedIn)',
]

function firstPhotoUrl(p: Prestataire): string | null {
  const g = Array.isArray(p.galerie) ? (p.galerie as unknown[]) : []
  for (const x of g) {
    if (typeof x === 'string' && x.startsWith('http')) return x
  }
  const photos = Array.isArray(p.photos) ? p.photos : []
  for (const x of photos) {
    if (typeof x === 'string' && x.startsWith('http')) return x
  }
  return null
}

function initials(nom: string): string {
  const parts = nom
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  return parts.map((p) => p[0] ?? '').join('').toUpperCase()
}

export async function ElleProfiles() {
  const { data: pionnieres } = await getPionnieres(3)
  const list = pionnieres ?? []

  return (
    <section className="bg-vert py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-14 max-w-3xl">
            <h2 className="font-serif text-h2 font-light leading-[1.05] text-creme md:text-display">
              Elles ont ouvert le carnet.
              <span className="block italic text-or">
                À toi d&apos;ajouter ta page.
              </span>
            </h2>
            <p className="mt-6 text-[15px] leading-[1.7] text-creme/80">
              Ta fiche, tes mots, ton rythme. C&apos;est parti&nbsp;?
            </p>
          </div>
        </FadeInSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => {
            const p = list[i]
            return p ? (
              <PionniereCard key={p.id} p={p} index={i} />
            ) : (
              <PlaceCard key={`place-${i}`} index={i} />
            )
          })}
        </div>

        <FadeInSection delay={0.3}>
          <div className="mt-16 rounded-sm border border-or/20 bg-vert-dark/40 p-8 md:mt-20 md:grid md:grid-cols-[1fr_1.5fr] md:items-start md:gap-12 md:p-12">
            <div className="mb-8 md:mb-0">
              <GoldLine width={40} />
              <p className="mt-5 overline text-or">Prestataire&nbsp;?</p>
              <h2 className="mt-3 font-serif text-2xl font-light leading-tight text-creme md:text-3xl">
                Trouve ta place dans la team.
              </h2>
              <p className="mt-4 text-[13px] leading-[1.7] text-creme/70">
                Trois paliers pour démarrer petit ou viser grand. Tu choisis
                ce qui te ressemble, tu changes quand tu veux.
              </p>
              <div className="mt-6">
                <HilmyButton variant="gold" withArrow href="/tarifs">
                  Voir les tarifs
                </HilmyButton>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PROVIDER_VALUE_PROP.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-[13px] leading-[1.6] text-creme/85"
                >
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-or"
                    aria-hidden="true"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

function PionniereCard({ p, index }: { p: Prestataire; index: number }) {
  const photo = firstPhotoUrl(p)
  const badgeNum = String(index + 1).padStart(2, '0')
  return (
    <FadeInSection delay={index * 0.1}>
      <Link
        href={`/prestataire-v2/${p.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-sm border border-or/25 bg-vert-dark/40 transition-all duration-500 hover:-translate-y-1 hover:border-or hover:bg-vert-dark/60"
      >
        <div className="relative h-60 w-full overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={p.nom}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-vert-dark to-vert">
              <span className="font-serif text-5xl font-light text-or/60">
                {initials(p.nom)}
              </span>
            </div>
          )}
          <span className="absolute top-3 left-3 rounded-full border border-or/40 bg-vert/80 px-3 py-1 text-[9px] font-medium tracking-[0.22em] text-or uppercase backdrop-blur">
            Pionnière&nbsp;{badgeNum}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-6">
          <p className="overline text-or">{categoryLabel(p.categorie)}</p>
          <h3 className="mt-2 font-serif text-xl font-light leading-tight text-creme">
            {p.nom}
          </h3>
          <p className="mt-1 text-[12px] text-creme/70">{p.ville}</p>
          <div className="mt-auto pt-5">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-or-light uppercase transition-all group-hover:gap-3 group-hover:text-or">
              Voir sa fiche
              <span className="text-or" aria-hidden="true">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </FadeInSection>
  )
}

function PlaceCard({ index }: { index: number }) {
  const slot = String(index + 1).padStart(2, '0')
  return (
    <FadeInSection delay={index * 0.1}>
      <Link
        href="/auth/signup?role=prestataire"
        className="group flex h-full flex-col rounded-sm border border-or/40 bg-creme p-6 transition-all duration-500 hover:-translate-y-1 hover:border-or hover:shadow-lg"
      >
        <div className="flex h-60 w-full items-center justify-center rounded-sm border border-dashed border-or/40 bg-creme-deep/40">
          <span className="font-serif text-6xl font-light text-or/60">
            {slot}
          </span>
        </div>
        <div className="flex flex-1 flex-col pt-5">
          <p className="overline text-or">Place&nbsp;{slot}</p>
          <h3 className="mt-2 font-serif text-xl font-light leading-tight text-vert">
            Crée ta fiche.
          </h3>
          <p className="mt-1 text-[12px] text-texte-sec">
            4 minutes top chrono.
          </p>
          <div className="mt-auto pt-5">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all group-hover:gap-3 group-hover:text-or-deep">
              Commencer
              <span className="text-or" aria-hidden="true">
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </FadeInSection>
  )
}
