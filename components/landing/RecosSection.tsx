import Link from 'next/link'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { placeCategoryLabel } from '@/lib/constants'
import { getRecosVitrine, type VitrineReco } from '@/lib/supabase/queries/recommendations'

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return (
    <span className="text-[13px] tracking-[0.15em] text-or" aria-label={`${full} sur 5`}>
      {'★'.repeat(full)}
      <span className="text-or/25">{'★'.repeat(5 - full)}</span>
    </span>
  )
}

export async function RecosSection() {
  const { data } = await getRecosVitrine(6)
  const list = data ?? []

  // Auto-masquage : aucune reco de copine → section absente du DOM.
  if (list.length === 0) return null

  return (
    <section className="bg-creme py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="overline mb-3 text-or">Bouche à oreille</p>
              <h2 className="font-serif text-h2 font-light leading-[1.05] text-vert md:text-display">
                Les copines recommandent.
              </h2>
              <p className="mt-6 text-[15px] leading-[1.7] text-texte-sec">
                Les adresses qu&apos;on s&apos;échange vraiment. Testées, approuvées,
                partagées entre nous.
              </p>
            </div>
            <Link
              href="/dashboard/utilisatrice/recommandations/nouvelle"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-or px-6 text-[11px] font-medium uppercase tracking-[0.22em] text-vert transition-all hover:bg-or-light"
            >
              Recommande ton adresse
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </FadeInSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r, i) => (
            <RecoCard key={r.place_slug} r={r} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function RecoCard({ r, index }: { r: VitrineReco; index: number }) {
  return (
    <FadeInSection delay={index * 0.05} className="h-full">
      <Link
        href={`/recommandation/${r.place_slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-sm bg-blanc p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {r.place_hilmy_category && (
            <span className="overline text-or">
              {placeCategoryLabel(r.place_hilmy_category)}
            </span>
          )}
          <Stars rating={r.rating} />
        </div>
        <h3 className="font-serif text-[20px] font-light leading-snug text-vert">
          {r.place_name}
        </h3>
        {r.place_city && (
          <p className="mt-1.5 text-[13px] text-texte-sec">{r.place_city}</p>
        )}
        <p className="mt-auto pt-5 text-[12px] italic text-texte-sec/80">
          Une copine recommande
        </p>
      </Link>
    </FadeInSection>
  )
}
