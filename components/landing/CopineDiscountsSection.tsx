import Link from 'next/link'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { CopineDiscountBadge } from '@/components/v2/CopineDiscountBadge'
import {
  getPrestatairesCopineDiscount,
  type PublicPrestataire,
} from '@/lib/supabase/queries/prestataires'
import { categoryLabel } from '@/lib/constants'

function firstPhotoUrl(p: PublicPrestataire): string | null {
  for (const arr of [p.galerie, p.photos]) {
    if (!Array.isArray(arr)) continue
    for (const x of arr) {
      if (typeof x === 'string' && x.startsWith('http')) return x
    }
  }
  return null
}

export async function CopineDiscountsSection() {
  const { data } = await getPrestatairesCopineDiscount(6)
  const list = data ?? []

  // Auto-masquage : aucune fiche avec réduction → section absente du DOM.
  if (list.length === 0) return null

  return (
    <section className="bg-creme py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-14 max-w-3xl">
            <p className="overline mb-3 text-or">Entre copines</p>
            <h2 className="font-serif text-h2 font-light leading-[1.05] text-vert md:text-display">
              Réductions copines.
            </h2>
            <p className="mt-6 text-[15px] leading-[1.7] text-texte-sec">
              Montre l&apos;app Hilmy en caisse pour en profiter.
            </p>
          </div>
        </FadeInSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <CopineDiscountCard key={p.id} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CopineDiscountCard({
  p,
  index,
}: {
  p: PublicPrestataire
  index: number
}) {
  const photoUrl = firstPhotoUrl(p)
  return (
    <FadeInSection delay={index * 0.05} className="h-full">
      <Link
        href={`/prestataires/${p.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-sm bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
      >
        <div className="relative h-52 w-full overflow-hidden bg-vert/5">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={p.nom}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <p className="overline text-or">{categoryLabel(p.categorie)}</p>
            <h3 className="mt-1 font-serif text-[20px] font-light text-vert">
              {p.nom}
            </h3>
            {p.ville && (
              <p className="text-[13px] text-texte-sec">{p.ville}</p>
            )}
          </div>
          {p.copine_discount_pct != null && (
            <div className="mt-auto">
              <CopineDiscountBadge
                pct={p.copine_discount_pct}
                note={p.copine_discount_note}
              />
            </div>
          )}
        </div>
      </Link>
    </FadeInSection>
  )
}
