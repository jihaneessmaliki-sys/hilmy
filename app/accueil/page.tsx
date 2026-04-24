import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageShell } from '@/components/v2/PageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { EvenementCard } from '@/components/v2/EvenementCard'
import { HomeMap, type MapPoint } from '@/components/v2/HomeMap'
import {
  getCentroid,
  offsetPoint,
  normalizeVille,
  formatVilleDisplay,
} from '@/lib/geo/city-centroids'
import type { Evenement as MockEvenement } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

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
  if (diffDays < 0) return `il y a ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === 1) return 'demain'
  if (diffDays < 7) return `dans ${diffDays} jours`
  if (diffDays < 30) return `dans ${Math.round(diffDays / 7)} semaines`
  return `dans ${Math.round(diffDays / 30)} mois`
}

type RecoForHome = {
  id: string
  type: 'place' | 'prestataire'
  comment: string | null
  rating: number | null
  created_at: string
  user_prenom: string | null
  target_nom: string
  target_href: string
  target_cover: string | null
}

type FavoriForHome = {
  id: string
  type_item: 'prestataire' | 'lieu' | 'evenement'
  titre: string
  sousTitre: string
  href: string
  cover: string | null
}

export default async function AccueilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // ── Profil + ville ────────────────────────────────────────────────
  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('prenom, ville')
    .eq('user_id', user.id)
    .maybeSingle()

  const prenom = profileRow?.prenom ?? null
  const ville = profileRow?.ville ?? null
  const villeLabel = formatVilleDisplay(ville)
  const centroid = getCentroid(ville)

  // ── Points carte ─────────────────────────────────────────────────
  const [placesRes, profilesRes, eventsMapRes] = await Promise.all([
    supabase
      .from('places')
      .select('id, name, slug, city, latitude, longitude, hilmy_category')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(30),
    supabase
      .from('profiles')
      .select('id, nom, slug, ville, categorie')
      .eq('status', 'approved')
      .limit(20),
    supabase
      .from('events')
      .select('id, title, slug, city, start_date, event_type')
      .eq('status', 'published')
      .gte('start_date', new Date().toISOString())
      .limit(20),
  ])

  const mapPoints: MapPoint[] = []

  for (const p of placesRes.data ?? []) {
    if (p.latitude == null || p.longitude == null) continue
    mapPoints.push({
      id: `place-${p.id}`,
      type: 'lieu',
      nom: p.name,
      sousTitre: p.city ?? null,
      href: `/recommandation/${p.slug ?? p.id}`,
      lat: p.latitude,
      lng: p.longitude,
    })
  }

  for (const pr of profilesRes.data ?? []) {
    const c = getCentroid(pr.ville)
    const off = offsetPoint(c, pr.id)
    mapPoints.push({
      id: `presta-${pr.id}`,
      type: 'prestataire',
      nom: pr.nom,
      sousTitre: pr.ville,
      href: `/prestataire-v2/${pr.slug}`,
      lat: off.lat,
      lng: off.lng,
    })
  }

  for (const ev of eventsMapRes.data ?? []) {
    const c = getCentroid(ev.city)
    const off = offsetPoint(c, ev.id)
    mapPoints.push({
      id: `event-${ev.id}`,
      type: 'evenement',
      nom: ev.title,
      sousTitre: `${ev.city ?? ''} · ${new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
      href: `/evenement-v2/${ev.slug ?? ev.id}`,
      lat: off.lat,
      lng: off.lng,
    })
  }

  // Priorise les points de la ville de l'utilisatrice (affichage initial plus pertinent).
  const userVilleKey = normalizeVille(ville)
  mapPoints.sort((a, b) => {
    // points de sa ville en premier (grossier : via sousTitre / lat-lng proches du centre)
    const aNear = Math.abs(a.lat - centroid.lat) < 0.3 && Math.abs(a.lng - centroid.lng) < 0.5
    const bNear = Math.abs(b.lat - centroid.lat) < 0.3 && Math.abs(b.lng - centroid.lng) < 0.5
    if (aNear && !bNear) return -1
    if (!aNear && bNear) return 1
    return 0
  })
  // silence unused
  void userVilleKey

  const limitedPoints = mapPoints.slice(0, 50)

  // ── 3 dernières recos ─────────────────────────────────────────────
  const { data: recosRows } = await supabase
    .from('recommendations')
    .select(
      `id, type, comment, rating, created_at, place_id, profile_id,
       user:user_profiles ( prenom ),
       place:places ( name, slug, main_photo_url, photos ),
       profile:profiles ( nom, slug, galerie, photos )`,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(3)

  const recos: RecoForHome[] = []
  type RawRecoRow = {
    id: string
    type: 'place' | 'prestataire'
    comment: string | null
    rating: number | null
    created_at: string
    place_id: string | null
    profile_id: string | null
    user: { prenom: string | null } | { prenom: string | null }[] | null
    place:
      | { name: string; slug: string | null; main_photo_url: string | null; photos: string[] | null }
      | { name: string; slug: string | null; main_photo_url: string | null; photos: string[] | null }[]
      | null
    profile:
      | { nom: string; slug: string; galerie: unknown; photos: string[] | null }
      | { nom: string; slug: string; galerie: unknown; photos: string[] | null }[]
      | null
  }
  for (const r of (recosRows ?? []) as unknown as RawRecoRow[]) {
    const u = Array.isArray(r.user) ? r.user[0] : r.user
    const place = Array.isArray(r.place) ? r.place[0] : r.place
    const profile = Array.isArray(r.profile) ? r.profile[0] : r.profile
    if (r.type === 'place' && place) {
      const photos = Array.isArray(place.photos) ? (place.photos as string[]) : []
      const cover = place.main_photo_url ?? photos[0] ?? null
      recos.push({
        id: r.id,
        type: 'place',
        comment: r.comment,
        rating: r.rating,
        created_at: r.created_at,
        user_prenom: u?.prenom ?? null,
        target_nom: place.name,
        target_href: `/recommandation/${place.slug ?? r.id}`,
        target_cover: cover,
      })
    } else if (r.type === 'prestataire' && profile) {
      const galerieArr = Array.isArray(profile.galerie) ? (profile.galerie as string[]) : []
      const photos = Array.isArray(profile.photos) ? (profile.photos as string[]) : []
      const cover = galerieArr[0] ?? photos[0] ?? null
      recos.push({
        id: r.id,
        type: 'prestataire',
        comment: r.comment,
        rating: r.rating,
        created_at: r.created_at,
        user_prenom: u?.prenom ?? null,
        target_nom: profile.nom,
        target_href: `/prestataire-v2/${profile.slug}`,
        target_cover: cover,
      })
    }
  }

  // ── 6 events à venir ─────────────────────────────────────────────
  const { data: eventsRows } = await supabase
    .from('events')
    .select('id, title, slug, description, start_date, city, address, event_type, flyer_url, places_max, inscrites_count')
    .eq('status', 'published')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(6)

  const events: MockEvenement[] = (eventsRows ?? []).map((ev) => ({
    slug: ev.slug ?? ev.id,
    titre: ev.title,
    date: formatDateFr(ev.start_date),
    dateRelative: relativeFr(ev.start_date),
    lieu: ev.address ?? ev.city ?? 'À venir',
    ville: (ev.city ?? '') as MockEvenement['ville'],
    categorie: ev.event_type ?? 'Autre',
    description: ev.description ?? '',
    organisatrice: 'HILMY',
    cover: '#D4C5B0',
    flyer: ev.flyer_url ?? null,
    places: ev.places_max ?? 20,
    inscrites: ev.inscrites_count ?? 0,
  }))

  // ── 3 favoris ────────────────────────────────────────────────────
  const { data: favRows } = await supabase
    .from('favoris')
    .select('id, type_item, item_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const favoris: FavoriForHome[] = []
  if (favRows && favRows.length > 0) {
    const byType = {
      prestataire: favRows.filter((f) => f.type_item === 'prestataire').map((f) => f.item_id),
      lieu: favRows.filter((f) => f.type_item === 'lieu').map((f) => f.item_id),
      evenement: favRows.filter((f) => f.type_item === 'evenement').map((f) => f.item_id),
    }

    const [prestaRes, lieuRes, eventFavRes] = await Promise.all([
      byType.prestataire.length
        ? supabase
            .from('profiles')
            .select('id, nom, slug, ville, categorie, galerie, photos')
            .in('id', byType.prestataire)
        : Promise.resolve({ data: [] }),
      byType.lieu.length
        ? supabase
            .from('places')
            .select('id, name, slug, city, hilmy_category, main_photo_url, photos')
            .in('id', byType.lieu)
        : Promise.resolve({ data: [] }),
      byType.evenement.length
        ? supabase
            .from('events')
            .select('id, title, slug, city, start_date, flyer_url')
            .in('id', byType.evenement)
        : Promise.resolve({ data: [] }),
    ])

    const prestaMap = new Map(((prestaRes.data ?? []) as Array<{ id: string; nom: string; slug: string; ville: string; categorie: string; galerie: unknown; photos: string[] | null }>).map((p) => [p.id, p]))
    const lieuMap = new Map(((lieuRes.data ?? []) as Array<{ id: string; name: string; slug: string | null; city: string | null; hilmy_category: string | null; main_photo_url: string | null; photos: string[] | null }>).map((p) => [p.id, p]))
    const eventMap = new Map(((eventFavRes.data ?? []) as Array<{ id: string; title: string; slug: string | null; city: string | null; start_date: string; flyer_url: string | null }>).map((p) => [p.id, p]))

    for (const f of favRows) {
      if (f.type_item === 'prestataire') {
        const p = prestaMap.get(f.item_id)
        if (!p) continue
        const galerieArr = Array.isArray(p.galerie) ? (p.galerie as string[]) : []
        const photos = Array.isArray(p.photos) ? p.photos : []
        favoris.push({
          id: f.id,
          type_item: 'prestataire',
          titre: p.nom,
          sousTitre: `${p.categorie} · ${p.ville}`,
          href: `/prestataire-v2/${p.slug}`,
          cover: galerieArr[0] ?? photos[0] ?? null,
        })
      } else if (f.type_item === 'lieu') {
        const p = lieuMap.get(f.item_id)
        if (!p) continue
        const photos = Array.isArray(p.photos) ? p.photos : []
        favoris.push({
          id: f.id,
          type_item: 'lieu',
          titre: p.name,
          sousTitre: `${p.hilmy_category ?? ''} · ${p.city ?? ''}`,
          href: `/recommandation/${p.slug ?? p.id}`,
          cover: p.main_photo_url ?? photos[0] ?? null,
        })
      } else if (f.type_item === 'evenement') {
        const ev = eventMap.get(f.item_id)
        if (!ev) continue
        favoris.push({
          id: f.id,
          type_item: 'evenement',
          titre: ev.title,
          sousTitre: `${ev.city ?? ''} · ${new Date(ev.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          href: `/evenement-v2/${ev.slug ?? ev.id}`,
          cover: ev.flyer_url ?? null,
        })
      }
    }
  }

  return (
    <PageShell navVariant="solid">
      {/* Hero mini */}
      <section className="relative overflow-hidden bg-creme-soft pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="absolute inset-0 bg-grain opacity-[0.06]" />
        <div className="relative mx-auto max-w-container px-6 md:px-20">
          <div className="flex items-center gap-4">
            <GoldLine width={48} />
            <span className="overline text-or">Ta page d&apos;accueil</span>
          </div>
          <h1 className="mt-6 font-serif text-4xl font-light leading-[1.1] text-vert md:text-5xl">
            Salut{prenom ? `, ${prenom}` : ''}.
            <br />
            <em className="italic text-or">Voici ce qui bouge</em>{' '}
            cette semaine{villeLabel ? ` à ${villeLabel}` : ''}.
          </h1>
          <p className="mt-5 max-w-xl text-[14px] leading-[1.7] text-texte-sec">
            Les adresses qui passent de main en main, les événements entre
            copines, les prestataires que les filles recommandent. Tout ce
            qu&apos;il te faut pour une semaine bien remplie.
          </p>
        </div>
      </section>

      {/* Map */}
      <section className="bg-creme py-14 md:py-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-4">
                  <GoldLine width={48} />
                  <span className="overline text-or">— autour de toi —</span>
                </div>
                <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                  La carte des adresses qu&apos;on aime.
                </h2>
              </div>
              <p className="max-w-sm text-[13px] italic leading-[1.55] text-texte-sec">
                Clique sur un pin pour voir la fiche. Tu peux zoomer, déplacer,
                explorer — la carte est à toi.
              </p>
            </div>
            <HomeMap center={centroid} points={limitedPoints} villeLabel={villeLabel ?? ''} />
          </FadeInSection>
        </div>
      </section>

      {/* Recos */}
      <section className="bg-blanc py-14 md:py-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-4">
                  <GoldLine width={48} />
                  <span className="overline text-or">— elles ont aimé —</span>
                </div>
                <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                  Les dernières pépites déposées.
                </h2>
              </div>
              <Link
                href="/recommandations"
                className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert transition-colors hover:text-or"
              >
                Voir toutes les recos
                <span className="text-or transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {recos.length === 0 ? (
              <div className="rounded-sm border border-dashed border-or/30 bg-creme-soft py-16 text-center">
                <p className="font-serif text-xl italic text-vert">
                  Le carnet se remplit — reviens dans quelques jours.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {recos.map((r) => (
                  <Link
                    key={r.id}
                    href={r.target_href}
                    className="group flex h-full flex-col overflow-hidden rounded-sm border border-or/15 bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
                  >
                    <div className="relative h-56 w-full overflow-hidden bg-creme-deep">
                      {r.target_cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.target_cover}
                          alt={r.target_nom}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
                        {r.type === 'place' ? 'Lieu' : 'Prestataire'}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-6">
                      <h3 className="font-serif text-xl font-light leading-tight text-vert">
                        {r.target_nom}
                      </h3>
                      {r.comment && (
                        <p className="line-clamp-3 font-serif text-[14px] italic leading-[1.55] text-texte-sec">
                          « {r.comment} »
                        </p>
                      )}
                      <p className="mt-auto border-t border-or/10 pt-3 text-[11px] tracking-[0.18em] text-or-deep uppercase">
                        {r.user_prenom ? `par ${r.user_prenom}` : 'par une copine'}
                        {r.rating != null && ` · ★ ${r.rating}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </FadeInSection>
        </div>
      </section>

      {/* Events */}
      <section className="bg-creme py-14 md:py-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-4">
                  <GoldLine width={48} />
                  <span className="overline text-or">— ça arrive bientôt —</span>
                </div>
                <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                  Les moments entre copines qui arrivent.
                </h2>
              </div>
              <Link
                href="/evenements-v2"
                className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert transition-colors hover:text-or"
              >
                Voir tous les événements
                <span className="text-or transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>

            {events.length === 0 ? (
              <div className="rounded-sm border border-dashed border-or/30 bg-blanc py-16 text-center">
                <p className="font-serif text-xl italic text-vert">
                  Aucun événement pour l&apos;instant. Propose-en un ?
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((e, i) => (
                  <EvenementCard key={e.slug} e={e} index={i} />
                ))}
              </div>
            )}
          </FadeInSection>
        </div>
      </section>

      {/* Favoris */}
      <section className="bg-blanc py-14 md:py-20">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <FadeInSection>
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-4">
                  <GoldLine width={48} />
                  <span className="overline text-or">— tes favoris —</span>
                </div>
                <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                  Tes coups de cœur, sauvegardés.
                </h2>
              </div>
              {favoris.length > 0 && (
                <Link
                  href="/dashboard/utilisatrice/favoris"
                  className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert transition-colors hover:text-or"
                >
                  Voir tous tes favoris
                  <span className="text-or transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              )}
            </div>

            {favoris.length === 0 ? (
              <div className="rounded-sm border border-dashed border-or/30 bg-creme-soft py-16 text-center">
                <p className="font-serif text-xl italic text-vert">
                  Tu n&apos;as pas encore de favori.
                </p>
                <p className="mt-3 max-w-md mx-auto text-[13px] leading-[1.65] text-texte-sec">
                  Découvre et sauvegarde tes adresses coups de cœur — tu les
                  retrouveras ici, toujours à portée.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/annuaire"
                    className="inline-flex h-10 items-center rounded-full bg-vert px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-vert-dark"
                  >
                    Explorer l&apos;annuaire
                  </Link>
                  <Link
                    href="/recommandations"
                    className="inline-flex h-10 items-center rounded-full border border-or px-5 text-[11px] font-medium tracking-[0.22em] text-or-deep uppercase hover:bg-or hover:text-vert"
                  >
                    Les recommandations
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {favoris.map((f) => (
                  <Link
                    key={f.id}
                    href={f.href}
                    className="group flex h-full flex-col overflow-hidden rounded-sm border border-or/15 bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-creme-deep">
                      {f.cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.cover}
                          alt={f.titre}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
                        {f.type_item === 'prestataire'
                          ? 'Prestataire'
                          : f.type_item === 'lieu'
                            ? 'Lieu'
                            : 'Événement'}
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-6">
                      <h3 className="font-serif text-xl font-light leading-tight text-vert">
                        {f.titre}
                      </h3>
                      <p className="text-[12px] text-texte-sec">{f.sousTitre}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </FadeInSection>
        </div>
      </section>
    </PageShell>
  )
}
