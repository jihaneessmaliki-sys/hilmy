import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { FavoriteButton } from '@/components/v2/FavoriteButton'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { LieuCard } from '@/components/v2/LieuCard'
import {
  categoriesLieux,
  type Lieu as MockLieu,
} from '@/lib/mock-data'
import {
  getPlaceBySlug,
  getPlacesByCategorie,
} from '@/lib/supabase/queries/places'
import { getRecommendationsByPlace } from '@/lib/supabase/queries/recommendations'
import { createClient } from '@/lib/supabase/server'
import type { Place, Recommendation } from '@/lib/supabase/types'
import { DIET_TAGS_MAP, dietTagLabel, recTagLabel } from '@/lib/constants'

type RecoView = {
  id: string
  prenom: string
  avatar: string
  date: string
  rating: number | null
  comment: string
  tags: string[]
  diets: string[]
  priceIndicator: string | null
  photos: string[]
}

const AVATAR_PALETTE = ['#B8C7B0', '#D9C9A8', '#C4B8D4', '#E8C5B5', '#A8C4C9', '#D4B8A8']

function avatarFor(userId: string) {
  let h = 0
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function relativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.round(diffMs / 86_400_000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days} j`
  if (days < 30) {
    const w = Math.round(days / 7)
    return `il y a ${w} sem.`
  }
  if (days < 365) {
    const m = Math.round(days / 30)
    return `il y a ${m} mois`
  }
  const y = Math.round(days / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

function catLabel(slug: string) {
  return categoriesLieux.find((c) => c.slug === slug)?.label ?? slug
}

function adaptDbPlace(p: Place): MockLieu {
  const photosArr =
    Array.isArray(p.photos) && p.photos.length > 0
      ? (p.photos as string[])
      : p.main_photo_url
        ? [p.main_photo_url]
        : []
  const cover = photosArr[0] && photosArr[0].startsWith('#') ? photosArr[0] : '#EEE6D8'
  return {
    slug: p.slug ?? p.id,
    nom: p.name,
    categorie: p.hilmy_category ?? 'restos-cafes',
    ville: p.city ?? '',
    adresse: p.address ?? '',
    description: p.description ?? '',
    cover,
    galerie: photosArr,
    recommandePar: [],
    commentaires: [],
  }
}

export default async function RecommandationPage({
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
    redirect(`/auth/signup?redirect=/recommandation/${encodeURIComponent(slug)}`)
  }

  const { data: row, error } = await getPlaceBySlug(slug)
  if (error || !row) notFound()
  const l: MockLieu = adaptDbPlace(row)

  // Fetch les recommandations publiées pour ce lieu + leurs autrices.
  const { data: recos } = await getRecommendationsByPlace(row.id)
  const recoRows = (recos ?? []) as Recommendation[]
  const userIds = Array.from(new Set(recoRows.map((r) => r.user_id)))
  const profilesById = new Map<string, { prenom: string }>()
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from('user_profiles')
      .select('user_id, prenom')
      .in('user_id', userIds)
    for (const p of (profs ?? []) as { user_id: string; prenom: string }[]) {
      profilesById.set(p.user_id, { prenom: p.prenom })
    }
  }
  const recoViews: RecoView[] = recoRows.map((r) => {
    const rawTags = r.tags ?? []
    const diets = rawTags.filter((t) => t in DIET_TAGS_MAP).map((t) => dietTagLabel(t))
    const tags = rawTags.filter((t) => !(t in DIET_TAGS_MAP)).map((t) => recTagLabel(t))
    return {
      id: r.id,
      prenom: profilesById.get(r.user_id)?.prenom ?? 'Une copine',
      avatar: avatarFor(r.user_id),
      date: relativeDate(r.created_at),
      rating: r.rating,
      comment: r.comment ?? '',
      tags,
      diets,
      priceIndicator: r.price_indicator,
      photos: r.photo_urls ?? [],
    }
  })

  let similaires: MockLieu[] = []
  if (row.hilmy_category) {
    const { data: rowsSim } = await getPlacesByCategorie(row.hilmy_category)
    similaires = (rowsSim ?? [])
      .filter((x) => (x.slug ?? x.id) !== slug)
      .slice(0, 3)
      .map(adaptDbPlace)
  }

  return (
    <PageShell>
      {/* Cover */}
      <section
        className="relative h-[54vh] min-h-[420px] overflow-hidden pt-20 md:h-[62vh]"
        style={
          l.galerie[0] && l.galerie[0].startsWith('http')
            ? {
                backgroundImage: `linear-gradient(160deg, rgba(15,61,46,0.3) 0%, rgba(245,240,230,0.3) 100%), url(${l.galerie[0]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                background: `linear-gradient(160deg, ${l.cover} 0%, ${l.galerie[1] ?? l.cover} 100%)`,
              }
        }
      >
        <div className="absolute inset-0 bg-grain opacity-[0.08]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-vert/40 to-transparent py-10">
          <div className="mx-auto max-w-container px-6 md:px-20">
            <Link
              href="/recommandations"
              className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:text-or-light"
            >
              <span
                className="text-or transition-transform group-hover:-translate-x-0.5"
                aria-hidden="true"
              >
                ←
              </span>
              Retour aux recommandations
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-creme/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
                {catLabel(l.categorie)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-vert/70 px-3 py-1 text-[10px] tracking-[0.22em] text-creme backdrop-blur uppercase">
                {l.ville}
              </span>
            </div>
            <h1 className="mt-5 font-serif text-display font-light leading-[0.95] text-creme">
              {l.nom}
            </h1>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.4fr_1fr] md:gap-20">
            {/* Main : les recommandations */}
            <div className="space-y-10">
              <FadeInSection>
                <header className="flex items-center gap-5">
                  <GoldLine width={60} />
                  <span className="overline text-or">
                    Ce qu&apos;on en dit
                    {recoViews.length > 1 ? ` · ${recoViews.length} recos` : ''}
                  </span>
                </header>
              </FadeInSection>

              {recoViews.length > 0 ? (
                <ul className="space-y-6">
                  {recoViews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-sm border border-or/15 bg-blanc p-6 md:p-8"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-10 w-10 rounded-full ring-1 ring-or/30"
                          style={{ background: r.avatar }}
                        />
                        <div>
                          <p className="text-[14px] font-medium text-vert">
                            {r.prenom}
                          </p>
                          <p className="text-[11px] text-texte-sec">{r.date}</p>
                        </div>
                        {r.rating && (
                          <span
                            className="ml-auto text-[18px] tracking-[0.1em] text-or"
                            aria-label={`${r.rating} / 5`}
                          >
                            {'★'.repeat(r.rating)}
                            <span className="text-or/25">
                              {'★'.repeat(5 - r.rating)}
                            </span>
                          </span>
                        )}
                      </div>

                      {r.comment && (
                        <p className="mt-5 font-serif text-[16px] italic leading-[1.7] text-texte md:text-[17px]">
                          « {r.comment} »
                        </p>
                      )}

                      {r.diets.length > 0 && (
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          {r.diets.map((d) => (
                            <span
                              key={d}
                              className="rounded-full border border-vert/30 bg-vert px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-creme uppercase"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {(r.tags.length > 0 || r.priceIndicator) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {r.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-or/25 bg-creme-soft px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-vert uppercase"
                            >
                              {t}
                            </span>
                          ))}
                          {r.priceIndicator && (
                            <span className="rounded-full border border-or/40 bg-or/10 px-3 py-1 font-serif text-[14px] text-or">
                              {r.priceIndicator}
                            </span>
                          )}
                        </div>
                      )}

                      {r.photos.length > 0 && (
                        <div className="mt-5 grid grid-cols-3 gap-2 md:grid-cols-4">
                          {r.photos.map((url, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="aspect-square w-full rounded-sm object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <FadeInSection>
                  <div className="rounded-sm border border-dashed border-or/30 bg-blanc p-10 text-center">
                    <p className="font-serif text-xl font-light text-vert">
                      Aucune recommandation pour l&apos;instant.
                    </p>
                    <p className="mt-2 text-[13px] text-texte-sec">
                      Tu connais l&apos;endroit ? Sois la première à en parler.
                    </p>
                  </div>
                </FadeInSection>
              )}
            </div>

            {/* Sidebar */}
            <aside className="md:sticky md:top-28 md:self-start">
              <div className="rounded-sm border border-or/15 bg-creme-deep p-8">
                <p className="overline text-or">Où c&apos;est</p>
                <p className="mt-4 font-serif text-lg font-light text-vert">
                  {l.adresse}
                </p>
                <div className="mt-5 h-px w-full bg-or/20" />
                <div className="mt-5 flex gap-2 text-[11px] text-texte-sec">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-or" />
                    Adresse via Google Maps
                  </span>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(l.adresse)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
                >
                  Ouvrir dans Maps
                  <span className="text-or" aria-hidden="true">
                    →
                  </span>
                </a>
                <div className="mt-3 flex flex-col gap-3">
                  <FavoriteButton
                    label="Sauvegarder"
                    labelActive="Sauvegardé"
                    variant="primary"
                  />
                </div>
              </div>

              {recoViews.length > 0 && (
                <div className="mt-6 rounded-sm border border-or/15 bg-blanc p-6">
                  <p className="overline text-or">
                    Recommandé par {recoViews.length} cop
                    {recoViews.length > 1 ? 'ines' : 'ine'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {recoViews.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 rounded-full border border-or/20 bg-creme-soft px-3 py-1.5"
                      >
                        <span
                          className="h-6 w-6 rounded-full ring-1 ring-or/30"
                          style={{ background: r.avatar }}
                        />
                        <span className="text-[12px] font-medium text-vert">
                          {r.prenom}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-sm border border-or/20 bg-vert p-8 text-creme">
                <p className="overline text-or">Tu y vas ?</p>
                <p className="mt-4 text-[13px] leading-[1.65] text-creme/80">
                  Reviens nous dire ce que tu en as pensé. C&apos;est comme ça que le
                  carnet s&apos;affine.
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
                    <span className="overline text-or">Dans le même genre</span>
                  </div>
                  <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                    Celles qu&apos;on aime aussi.
                  </h2>
                </div>
                <Link
                  href="/recommandations"
                  className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert hover:text-or transition-colors"
                >
                  Voir toutes les recos
                  <span
                    className="text-or transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              </div>
            </FadeInSection>
            <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
              {similaires.map((s, i) => (
                <LieuCard key={s.slug} lieu={s} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}
