'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { GoldLine } from '@/components/ui/GoldLine'
import { ConfirmModal } from '@/components/v2/ConfirmModal'
import { createClient } from '@/lib/supabase/client'

type EventLite = {
  id: string
  title: string
  slug: string | null
  city: string | null
  address: string | null
  event_type: string | null
  start_date: string
  end_date: string | null
  flyer_url: string | null
  status: string
  visibility: string
  inscrites_count: number
  places_max: number | null
}

type Inscription = {
  id: string
  status: 'inscrite' | 'annulee' | 'liste_attente'
  event: EventLite | null
}

const EVENT_COLS =
  'id, title, slug, city, address, event_type, start_date, end_date, flyer_url, status, visibility, inscrites_count, places_max'

export default function MesEvenementsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [savedEvents, setSavedEvents] = useState<EventLite[]>([])
  const [ownedEvents, setOwnedEvents] = useState<EventLite[]>([])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expirée.')
      setLoading(false)
      return
    }

    const [insRes, favRes, ownedRes] = await Promise.all([
      supabase
        .from('event_inscriptions')
        .select(
          `id, status, event:events ( ${EVENT_COLS} )`,
        )
        .eq('user_id', user.id)
        .eq('status', 'inscrite'),
      supabase
        .from('favoris')
        .select('id, item_id, created_at')
        .eq('user_id', user.id)
        .eq('type_item', 'evenement')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select(EVENT_COLS)
        .eq('user_id', user.id)
        .neq('status', 'removed')
        .order('start_date', { ascending: true }),
    ])

    if (insRes.error) {
      setError(insRes.error.message)
      setLoading(false)
      return
    }

    setInscriptions((insRes.data ?? []) as unknown as Inscription[])
    setOwnedEvents((ownedRes.data ?? []) as EventLite[])

    const favIds = (favRes.data ?? []).map((f) => f.item_id)
    if (favIds.length) {
      const { data: evs } = await supabase
        .from('events')
        .select(EVENT_COLS)
        .in('id', favIds)
      setSavedEvents((evs ?? []) as EventLite[])
    } else {
      setSavedEvents([])
    }

    setLoading(false)
  }

  // Annulation d'un event créé
  type PendingCancel = { id: string; title: string; inscrites: number } | null
  const [pendingCancel, setPendingCancel] = useState<PendingCancel>(null)
  const [cancelling, setCancelling] = useState(false)

  const handleCancelEvent = async () => {
    if (!pendingCancel) return
    setCancelling(true)
    setError(null)
    const res = await fetch(`/api/events/${pendingCancel.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notify: pendingCancel.inscrites > 0 }),
    })
    const body = await res.json().catch(() => ({}))
    setCancelling(false)
    if (!res.ok) {
      setError(body.error ?? 'Impossible d\'annuler l\'événement.')
      setPendingCancel(null)
      return
    }
    setOwnedEvents((cur) => cur.filter((e) => e.id !== pendingCancel.id))
    setPendingCancel(null)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const registered = useMemo(
    () =>
      inscriptions
        .map((i) => i.event)
        .filter((e): e is EventLite => !!e && e.status === 'published'),
    [inscriptions],
  )

  const now = Date.now()
  const futureRegistered = registered.filter(
    (e) => new Date(e.start_date).getTime() >= now,
  )
  const futureSaved = savedEvents.filter(
    (e) =>
      e.status === 'published' && new Date(e.start_date).getTime() >= now,
  )
  const futureOwned = ownedEvents.filter(
    (e) => new Date(e.start_date).getTime() >= now,
  )

  return (
    <>
      <DashboardHeader
        kicker="Mes événements"
        titre={
          <>
            Tes prochains
            <br />
            <em className="font-serif italic text-or">moments en vrai.</em>
          </>
        }
        lead="Les événements que tu as sauvegardés ou auxquels tu t'es inscrite. On te rappelle par email la veille."
        actions={
          <Link
            href="/evenements-v2"
            className="group inline-flex h-11 items-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
          >
            Voir l&apos;agenda
            <span
              className="text-or transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        }
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-sm bg-creme-deep"
              />
            ))}
          </div>
        ) : futureRegistered.length === 0 &&
          futureSaved.length === 0 &&
          futureOwned.length === 0 ? (
          <EmptyState
            kicker="Rien de prévu"
            titre="Ton agenda est vide."
            pitch={
              <>
                Parcours les événements et inscris-toi à celui qui te parle.
                C&apos;est gratuit, bienveillant, et c&apos;est là que tu
                rencontreras des copines.
              </>
            }
            ctaLabel="Voir l'agenda"
            ctaHref="/evenements-v2"
          />
        ) : (
          <div className="space-y-14">
            {futureOwned.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <GoldLine width={40} />
                  <span className="overline text-or">
                    Tu organises · {futureOwned.length}
                  </span>
                </div>
                <EventGrid
                  events={futureOwned}
                  badge="Tu organises"
                  showAddress
                  onCancel={(e) =>
                    setPendingCancel({
                      id: e.id,
                      title: e.title,
                      inscrites: e.inscrites_count,
                    })
                  }
                />
              </div>
            )}
            {futureRegistered.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <GoldLine width={40} />
                  <span className="overline text-or">
                    Inscrite · {futureRegistered.length}
                  </span>
                </div>
                <EventGrid
                  events={futureRegistered}
                  badge="Inscrite"
                  showAddress
                />
              </div>
            )}
            {futureSaved.length > 0 && (
              <div>
                <div className="mb-6 flex items-center gap-4">
                  <GoldLine width={40} />
                  <span className="overline text-or">
                    Sauvegardée · {futureSaved.length}
                  </span>
                </div>
                <EventGrid events={futureSaved} badge="Favori" />
              </div>
            )}
          </div>
        )}
      </section>

      <ConfirmModal
        open={pendingCancel !== null}
        titre={
          pendingCancel && pendingCancel.inscrites > 0
            ? `Annuler « ${pendingCancel.title} » ?`
            : 'Supprimer cet événement ?'
        }
        description={
          pendingCancel && pendingCancel.inscrites > 0 ? (
            <>
              <p>
                <strong className="text-vert">
                  {pendingCancel.inscrites} copine
                  {pendingCancel.inscrites > 1 ? 's sont' : ' est'} inscrite
                  {pendingCancel.inscrites > 1 ? 's' : ''}
                </strong>{' '}
                à ton événement. En le supprimant, on leur envoie un email
                pour les prévenir de l&apos;annulation.
              </p>
              <p className="mt-3 italic text-texte-sec">
                Cette action est irréversible.
              </p>
            </>
          ) : (
            <p>
              Cette action est irréversible. Ton événement disparaîtra de
              l&apos;agenda.
            </p>
          )
        }
        confirmLabel={
          pendingCancel && pendingCancel.inscrites > 0
            ? 'Annuler + prévenir'
            : 'Supprimer'
        }
        cancelLabel="Retour"
        tone="danger"
        loading={cancelling}
        onConfirm={handleCancelEvent}
        onCancel={() => setPendingCancel(null)}
      />
    </>
  )
}

function EventGrid({
  events,
  badge,
  showAddress = false,
  onCancel,
}: {
  events: EventLite[]
  badge: string
  showAddress?: boolean
  onCancel?: (event: EventLite) => void
}) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e, i) => {
        const d = new Date(e.start_date)
        const jour = String(d.getDate()).padStart(2, '0')
        const mois = d.toLocaleDateString('fr-FR', { month: 'short' })
        return (
          <motion.article
            key={e.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="overflow-hidden rounded-sm border border-or/15 bg-blanc"
          >
            <div className="relative h-40 w-full bg-creme-deep">
              {e.flyer_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.flyer_url}
                  alt={e.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <span className="absolute top-3 right-3 rounded-full bg-or/90 px-3 py-1 text-[10px] tracking-[0.22em] text-vert uppercase">
                {badge}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl font-light text-or">
                  {jour}
                </span>
                <span className="text-[11px] tracking-[0.22em] text-or-deep uppercase">
                  {mois}
                </span>
              </div>
              <Link
                href={`/evenement-v2/${e.slug ?? e.id}`}
                className="mt-2 block font-serif text-lg font-light text-vert hover:text-or"
              >
                {e.title}
              </Link>
              <p className="mt-1 text-[11px] text-texte-sec">
                {e.event_type && `${e.event_type} · `}
                {e.city}
              </p>
              {showAddress && e.address && (
                <p className="mt-3 border-t border-or/10 pt-3 text-[11px] leading-[1.5] text-vert">
                  📍 {e.address}
                </p>
              )}
              {e.places_max && (
                <p
                  className={`${showAddress && e.address ? 'mt-2' : 'mt-3 border-t border-or/10 pt-3'} text-[11px] text-texte-sec`}
                >
                  {e.inscrites_count}/{e.places_max} inscrites
                </p>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(e)}
                  className="mt-4 block text-[11px] tracking-[0.22em] text-texte-sec uppercase transition-colors hover:text-red-900"
                >
                  Annuler / supprimer →
                </button>
              )}
            </div>
          </motion.article>
        )
      })}
    </div>
  )
}
