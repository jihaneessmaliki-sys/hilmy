import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { FavoriteButton } from '@/components/v2/FavoriteButton'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { EvenementCard } from '@/components/v2/EvenementCard'
import { EventInscriptionCTA } from '@/components/v2/EventInscriptionCTA'
import { type Evenement as MockEvenement } from '@/lib/mock-data'
import {
  getEventBySlug,
  getUpcomingEvents,
} from '@/lib/supabase/queries/events'
import { createClient } from '@/lib/supabase/server'
import { eventTypeLabel } from '@/lib/constants'
import type { HilmyEvent } from '@/lib/supabase/types'

const MOIS_COURTS = [
  'janv', 'févr', 'mars', 'avril', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
]

function formatDateFr(iso: string) {
  const d = new Date(iso)
  const jour = String(d.getDate()).padStart(2, '0')
  const mois = MOIS_COURTS[d.getMonth()]
  const annee = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${jour} ${mois} ${annee} · ${h}h${m}`
}

function relativeFr(iso: string): string {
  const now = Date.now()
  const target = new Date(iso).getTime()
  const diffDays = Math.round((target - now) / 86400000)
  if (diffDays < 0) return `passé · ${Math.abs(diffDays)}j`
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'demain'
  if (diffDays < 7) return `dans ${diffDays} jours`
  if (diffDays < 30) return `dans ${Math.round(diffDays / 7)} semaines`
  return `dans ${Math.round(diffDays / 30)} mois`
}

function adaptDbEventForCard(ev: HilmyEvent): MockEvenement {
  return {
    slug: ev.slug ?? ev.id,
    titre: ev.title,
    date: formatDateFr(ev.start_date),
    dateRelative: relativeFr(ev.start_date),
    lieu: ev.city ?? 'À venir',
    ville: ev.city ?? '',
    categorie: eventTypeLabel(ev.event_type ?? 'Autre'),
    description: ev.description,
    organisatrice: 'HILMY',
    cover: '#D4C5B0',
    flyer: ev.flyer_url ?? null,
    places: ev.places_max ?? 20,
    inscrites: ev.inscrites_count ?? 0,
  }
}

export default async function EvenementV2Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/signup?redirect=/evenement-v2/${encodeURIComponent(slug)}`)
  }

  const { data: ev, error } = await getEventBySlug(slug)
  if (error || !ev) notFound()

  const { data: upcoming } = await getUpcomingEvents()

  // Inscription status (si user connectée)
  let isInscrite = false
  if (user) {
    const { data: ins } = await supabase
      .from('event_inscriptions')
      .select('status')
      .eq('event_id', ev.id)
      .eq('user_id', user.id)
      .maybeSingle()
    isInscrite = ins?.status === 'inscrite'
  }

  const isOwner = !!user && user.id === ev.user_id
  const canSeeAddress = isOwner || isInscrite
  const isAuthenticated = !!user

  const similaires: MockEvenement[] = (upcoming ?? [])
    .filter((x) => (x.slug ?? x.id) !== slug && x.id !== ev.id)
    .slice(0, 3)
    .map(adaptDbEventForCard)

  const placesMax = ev.places_max ?? null
  const inscritesCount = ev.inscrites_count ?? 0
  const placesRestantes =
    placesMax !== null ? Math.max(0, placesMax - inscritesCount) : null

  const cover = ev.flyer_url ?? '#D4C5B0'
  const coverIsUrl = cover.startsWith('http') || cover.startsWith('/')
  const categorieLabel = eventTypeLabel(ev.event_type ?? 'autre')
  const dateDisplay = formatDateFr(ev.start_date)
  const dateRelative = relativeFr(ev.start_date)
  const [jour, mois, annee] = dateDisplay.split(' ')
  const heure = dateDisplay.split('·')[1]?.trim()

  return (
    <PageShell>
      {/* Flyer hero */}
      <section
        className="relative min-h-[60vh] overflow-hidden pt-28 pb-20 md:pt-36"
        style={
          coverIsUrl
            ? {
                backgroundImage: `linear-gradient(160deg, rgba(15,61,46,0.25), rgba(245,240,230,0.85)), url(${cover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                background: `linear-gradient(160deg, ${cover} 0%, #EEE6D8 100%)`,
              }
        }
      >
        <div className="absolute inset-0 bg-grain opacity-[0.08]" />

        <div className="relative mx-auto max-w-container px-6 md:px-20">
          <Link
            href="/evenements-v2"
            className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or"
          >
            <span
              className="text-or transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              ←
            </span>
            Retour aux événements
          </Link>

          <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.6fr] md:gap-16 md:items-start">
            {/* Left: big date */}
            <div className="rounded-sm border border-or/30 bg-blanc p-8 md:p-10 shadow-[0_30px_80px_-40px_rgba(15,61,46,0.35)]">
              <div className="flex items-center gap-4">
                <GoldLine width={40} />
                <span className="overline text-or">{categorieLabel}</span>
              </div>
              <p className="mt-8 font-serif text-[120px] font-light leading-none text-vert md:text-[140px]">
                {jour}
              </p>
              <p className="mt-2 text-[13px] tracking-[0.28em] text-or-deep uppercase">
                {mois} {annee}
              </p>
              {heure && (
                <p className="mt-1 text-[14px] font-medium text-texte">
                  {heure}
                </p>
              )}
              <div className="mt-8 h-px w-full bg-or/20" />
              <p className="mt-6 overline text-or">Lieu</p>
              {canSeeAddress && ev.address ? (
                <>
                  <p className="mt-2 text-[14px] font-medium text-vert">
                    {ev.address}
                  </p>
                  <p className="text-[12px] text-texte-sec">{ev.city}</p>
                  <p className="mt-2 text-[10px] tracking-[0.18em] text-or uppercase">
                    Adresse visible car {isOwner ? 'tu organises' : 'tu es inscrite'}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[14px] font-medium text-vert">
                    {ev.city ?? 'À venir'}
                  </p>
                  <p className="mt-2 text-[11px] italic leading-[1.6] text-texte-sec">
                    📍 L&apos;adresse précise sera partagée aux inscrites dans
                    l&apos;email de confirmation.
                  </p>
                </>
              )}
            </div>

            {/* Right: headline + CTAs */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
                {dateRelative}
              </span>
              <h1 className="mt-5 font-serif text-display font-light leading-[0.95] text-vert">
                {ev.title}
              </h1>
              <p className="mt-8 max-w-xl font-serif text-[19px] italic leading-[1.55] text-texte md:text-[20px]">
                {ev.description}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <EventInscriptionCTA
                  eventId={ev.id}
                  eventSlug={ev.slug ?? ev.id}
                  isAuthenticated={isAuthenticated}
                  initiallyInscrite={isInscrite}
                  isOwner={isOwner}
                  placesMax={placesMax}
                  inscritesCount={inscritesCount}
                  variant="solid"
                  registrationMode={ev.registration_mode ?? 'internal'}
                  externalUrl={ev.external_signup_url}
                />
                <FavoriteButton label="Sauvegarder" labelActive="Sauvegardé" />
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-[12px] text-texte-sec">
                {ev.registration_mode === 'internal' && (
                  <span>
                    <strong className="text-vert">{inscritesCount}</strong>{' '}
                    inscrite{inscritesCount > 1 ? 's' : ''}
                    {placesRestantes !== null && (
                      <>
                        {' · '}
                        <strong className="text-vert">{placesRestantes}</strong>{' '}
                        place{placesRestantes > 1 ? 's' : ''}{' '}
                        {placesRestantes > 1 ? 'restantes' : 'restante'}
                      </>
                    )}
                  </span>
                )}
                {ev.price_type === 'gratuit' ? (
                  <span className="rounded-full bg-vert/10 px-3 py-1 text-[11px] text-vert">
                    Gratuit
                  </span>
                ) : ev.price_amount ? (
                  <span className="rounded-full bg-or/15 px-3 py-1 text-[11px] text-or-deep">
                    {ev.price_amount} {ev.price_currency ?? ''}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.3fr_1fr] md:gap-20">
            <div className="space-y-16">
              <FadeInSection>
                <header className="flex items-center gap-5">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    01
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">Pourquoi venir</span>
                </header>
                <div className="mt-6 space-y-5 text-[15px] leading-[1.75] text-texte">
                  <p>{ev.description}</p>
                </div>
              </FadeInSection>

              <FadeInSection>
                <header className="flex items-center gap-5">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    02
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">Infos pratiques</span>
                </header>
                <dl className="mt-6 divide-y divide-or/15 rounded-sm border border-or/15 bg-blanc">
                  <InfoRow label="Date" value={dateDisplay} />
                  <InfoRow
                    label="Lieu"
                    value={
                      canSeeAddress && ev.address
                        ? `${ev.address}, ${ev.city ?? ''}`
                        : `${ev.city ?? 'À venir'} · adresse partagée aux inscrites`
                    }
                  />
                  <InfoRow
                    label="Format"
                    value={ev.format === 'en_ligne' ? 'En ligne' : 'En présentiel'}
                  />
                  <InfoRow
                    label="Places"
                    value={
                      placesMax
                        ? `${inscritesCount} / ${placesMax} inscrites`
                        : `${inscritesCount} inscrites · places illimitées`
                    }
                  />
                  <InfoRow
                    label="Tarif"
                    value={
                      ev.price_type === 'gratuit'
                        ? 'Gratuit — sur inscription'
                        : `${ev.price_amount ?? ''} ${ev.price_currency ?? ''}`
                    }
                  />
                  {ev.external_signup_url && (
                    <InfoRow
                      label="Lien externe"
                      value={
                        <a
                          href={ev.external_signup_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-or-deep underline-offset-4 hover:text-or hover:underline"
                        >
                          Page d&apos;inscription externe →
                        </a>
                      }
                    />
                  )}
                  {ev.format === 'en_ligne' && ev.online_link && canSeeAddress && (
                    <InfoRow
                      label="Lien de connexion"
                      value={
                        <a
                          href={ev.online_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-or-deep underline-offset-4 hover:text-or hover:underline"
                        >
                          {ev.online_link}
                        </a>
                      }
                    />
                  )}
                </dl>
                {!canSeeAddress && ev.format === 'en_ligne' && (
                  <p className="mt-4 text-[12px] italic text-texte-sec">
                    Le lien de connexion sera envoyé par email aux inscrites.
                  </p>
                )}
              </FadeInSection>
            </div>

            <aside className="md:sticky md:top-28 md:self-start">
              <div className="rounded-sm bg-vert p-8 text-creme">
                <p className="overline text-or">L&apos;essentiel</p>
                <p className="mt-4 font-serif text-2xl font-light leading-tight">
                  On se retrouve le {jour} {mois.toLowerCase()}.
                </p>
                <p className="mt-3 text-[13px] leading-[1.7] text-creme/75">
                  {ev.registration_mode === 'info_only'
                    ? "Gratuit sans inscription. Clique pour plus d'infos officielles."
                    : ev.registration_mode === 'external'
                      ? "Inscription sur le site officiel — le lien t'y emmène directement."
                      : "Inscris-toi, on t'envoie l'adresse précise par email."}
                  {isOwner && " C'est toi qui organises."}
                </p>
                <div className="mt-6">
                  <EventInscriptionCTA
                    eventId={ev.id}
                    eventSlug={ev.slug ?? ev.id}
                    isAuthenticated={isAuthenticated}
                    initiallyInscrite={isInscrite}
                    isOwner={isOwner}
                    placesMax={placesMax}
                    inscritesCount={inscritesCount}
                    variant="outline"
                    registrationMode={ev.registration_mode ?? 'internal'}
                    externalUrl={ev.external_signup_url}
                  />
                </div>
              </div>

              <div className="mt-6 rounded-sm border border-or/20 bg-creme-deep p-8">
                <p className="overline text-or">Tu as des questions ?</p>
                <p className="mt-3 text-[13px] leading-[1.65] text-texte-sec">
                  Écris à{' '}
                  <a
                    href="mailto:hello@hilmy.io"
                    className="font-medium text-vert hover:text-or"
                  >
                    hello@hilmy.io
                  </a>
                  . On te répond sous 48h ouvrées.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {similaires.length > 0 && (
        <section className="bg-blanc py-20 md:py-28">
          <div className="mx-auto max-w-container px-6 md:px-20">
            <FadeInSection>
              <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <div className="flex items-center gap-4">
                    <GoldLine width={48} />
                    <span className="overline text-or">Aussi au programme</span>
                  </div>
                  <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                    D&apos;autres moments qui arrivent.
                  </h2>
                </div>
                <Link
                  href="/evenements-v2"
                  className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert hover:text-or transition-colors"
                >
                  Tous les événements
                  <span
                    className="text-or transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </FadeInSection>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similaires.map((s, i) => (
                <EvenementCard key={s.slug} e={s} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 md:flex-row md:items-center md:justify-between">
      <dt className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
        {label}
      </dt>
      <dd className="font-serif text-[15px] text-vert">{value}</dd>
    </div>
  )
}
