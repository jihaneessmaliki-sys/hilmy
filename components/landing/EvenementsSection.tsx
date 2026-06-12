import Link from 'next/link'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { getProchainEvents, type PublicEvent } from '@/lib/supabase/queries/events'

const MOIS_COURTS = [
  'janv',
  'févr',
  'mars',
  'avril',
  'mai',
  'juin',
  'juil',
  'août',
  'sept',
  'oct',
  'nov',
  'déc',
]

function formatDateFr(iso: string): string {
  const d = new Date(iso)
  const jour = String(d.getDate()).padStart(2, '0')
  const mois = MOIS_COURTS[d.getMonth()]
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${jour} ${mois} ${d.getFullYear()} · ${h}h${m}`
}

export async function EvenementsSection() {
  const { data } = await getProchainEvents(3)
  const list = data ?? []

  // Auto-masquage : aucun événement à venir → section absente du DOM.
  if (list.length === 0) return null

  return (
    <section className="bg-creme py-28 md:py-36">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <FadeInSection>
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="overline mb-3 text-or">Entre copines</p>
              <h2 className="font-serif text-h2 font-light leading-[1.05] text-vert md:text-display">
                Événements de la commu.
              </h2>
              <p className="mt-6 text-[15px] leading-[1.7] text-texte-sec">
                Brunchs, ateliers, balades. Les prochains moments qu&apos;on vit
                ensemble.
              </p>
            </div>
            <Link
              href="/dashboard/utilisatrice/evenements/nouveau"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-or px-6 text-[11px] font-medium uppercase tracking-[0.22em] text-vert transition-all hover:bg-or-light"
            >
              Ajouter le tien
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </FadeInSection>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e, i) => (
            <EvenementCard key={e.id} e={e} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function EvenementCard({ e, index }: { e: PublicEvent; index: number }) {
  const href = `/evenement-v2/${e.slug ?? e.id}`
  return (
    <FadeInSection delay={index * 0.05} className="h-full">
      <Link
        href={href}
        className="group flex h-full flex-col overflow-hidden rounded-sm bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
      >
        {/* Flyer volontairement omis : son URL de stockage contient le
            user_id de la créatrice (cf. PUBLIC_EVENT_SELECT). Bloc visuel
            sobre en attendant le re-key storage du Lot B. */}
        <div className="flex h-40 w-full items-center justify-center bg-vert/[0.06]">
          <span className="font-serif text-[44px] font-light leading-none text-or/60">
            {String(new Date(e.start_date).getDate()).padStart(2, '0')}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <p className="overline text-or">{formatDateFr(e.start_date)}</p>
          <h3 className="font-serif text-[20px] font-light leading-snug text-vert">
            {e.title}
          </h3>
          {e.city && <p className="mt-auto text-[13px] text-texte-sec">{e.city}</p>}
        </div>
      </Link>
    </FadeInSection>
  )
}
