import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { LieuCard } from '@/components/v2/LieuCard'
import { categoriesLieux, type Lieu as MockLieu } from '@/lib/mock-data'
import { isSelectionHilmy } from '@/lib/permissions-lieux'
import { DIET_TAGS_MAP, dietTagLabel, recTagLabel } from '@/lib/constants'
import { formatRating, copineWord } from '@/lib/reco-format'
import { CommunityPhotosSection } from '@/components/v2/CommunityPhotosSection'
import type { CommunityPhoto } from '@/components/v2/CommunityPhotos'
import type {
  PublicPlaceDetail,
  PublicPlaceReco,
} from '@/lib/supabase/queries/places-public'

/**
 * Rendu PUBLIC (anonyme, indexable SEO) de la fiche reco.
 *
 * ⚠️ ÉTANCHÉITÉ — ce composant n'importe NI MemberName, NI gamif, NI aucune
 * source identitaire, et son type de props (PublicReco) ne contient AUCUN
 * champ permettant de réidentifier une autrice (pas de prenom/avatar/user_id/
 * is_copine/statut). Le compilateur interdit donc de fuiter une identité ici.
 * Le rendu RICHE connecté reste dans RecommandationDetail.tsx, inchangé.
 *
 * Server Component (pas de 'use client') → HTML rendu côté serveur =
 * indexable. Les enfants client (FadeInSection, LieuCard) sont OK en RSC.
 */

type PublicReco = {
  reco_id: string
  date: string
  rating: number | null
  comment: string | null
  tags: string[]
  diets: string[]
  priceIndicator: string | null
}

function catLabel(slug: string | null) {
  if (!slug) return ''
  return categoriesLieux.find((c) => c.slug === slug)?.label ?? slug
}

function relativeDate(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days < 1) return "aujourd'hui"
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.round(days / 7)} sem.`
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`
  const y = Math.round(days / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}

/** Adapte un détail public en MockLieu pour LieuCard (similaires). */
function detailToMockLieu(d: PublicPlaceDetail): MockLieu {
  const photosArr = Array.isArray(d.photos) ? d.photos : []
  const galerie = d.main_photo_url ? [d.main_photo_url, ...photosArr] : photosArr
  return {
    slug: d.place_slug,
    nom: d.name,
    categorie: d.hilmy_category ?? 'restos-cafes',
    ville: d.city ?? '',
    adresse: d.address ?? '',
    description: d.description ?? '',
    cover: '#EEE6D8',
    galerie,
    recommandePar: [],
    commentaires: [],
    palier: d.palier ?? undefined,
  }
}

function toPublicReco(r: PublicPlaceReco): PublicReco {
  const rawTags = r.tags ?? []
  const diets = rawTags.filter((t) => t in DIET_TAGS_MAP).map(dietTagLabel)
  const tags = rawTags.filter((t) => !(t in DIET_TAGS_MAP)).map(recTagLabel)
  return {
    reco_id: r.reco_id,
    date: relativeDate(r.created_at),
    rating: r.rating,
    comment: r.comment,
    tags,
    diets,
    priceIndicator: r.price_indicator,
  }
}

export function RecommandationDetailPublic({
  detail,
  recos,
  similaires,
  communityPhotos,
}: {
  detail: PublicPlaceDetail
  recos: PublicPlaceReco[]
  similaires: PublicPlaceDetail[]
  // Galerie communauté (vue anon-safe place_public_photos). Signalement INDIRECT
  // ici (anonyme) → canReport=false, le bouton renvoie vers l'inscription.
  communityPhotos: CommunityPhoto[]
}) {
  const photosArr = Array.isArray(detail.photos) ? detail.photos : []
  const coverUrl =
    detail.main_photo_url && detail.main_photo_url.startsWith('http')
      ? detail.main_photo_url
      : null
  // Galerie = photos du lieu hors cover (la cover est déjà dans le hero).
  const galleryPhotos = photosArr.filter(
    (u) => typeof u === 'string' && u.startsWith('http') && u !== coverUrl,
  )

  // On ne garde QUE les recos qui ont du contenu à montrer (commentaire OU
  // note) → pas de carte vide « moche » (mode dégradé propre, cf. UX3).
  const recoViews = recos
    .map(toPublicReco)
    .filter((r) => (r.comment && r.comment.trim().length > 0) || r.rating)
  const soloReco = recoViews.length === 1

  const signupHref = `/auth/signup?redirect=/recommandation/${encodeURIComponent(detail.place_slug)}`
  const mapsHref = detail.google_place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${detail.name} ${detail.address}`,
      )}&query_place_id=${encodeURIComponent(detail.google_place_id)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.address)}`

  const typeLabel = detail.google_category
    ? detail.google_category.replace(/_/g, ' ')
    : null

  return (
    <PageShell>
      {/* Cover */}
      <section
        className="relative h-[54vh] min-h-[420px] overflow-hidden pt-20 md:h-[62vh]"
        style={
          coverUrl
            ? {
                backgroundImage: `linear-gradient(160deg, rgba(15,61,46,0.3) 0%, rgba(245,240,230,0.3) 100%), url(${coverUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: 'linear-gradient(160deg, #EEE6D8 0%, #D9C9A8 100%)' }
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
              {isSelectionHilmy(detail) && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-creme px-3 py-1.5 font-serif text-[11px] font-light italic tracking-[0.2em] text-or shadow-[0_2px_8px_-2px_rgba(15,61,46,0.25)] uppercase backdrop-blur"
                  aria-label="Lieu Sélection Hilmy"
                >
                  <span aria-hidden="true">✨</span>
                  Sélection Hilmy
                </span>
              )}
              {detail.hilmy_category && (
                <span className="inline-flex items-center gap-2 rounded-full bg-creme/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
                  {catLabel(detail.hilmy_category)}
                </span>
              )}
              {detail.city && (
                <span className="inline-flex items-center gap-2 rounded-full bg-vert/70 px-3 py-1 text-[10px] tracking-[0.22em] text-creme backdrop-blur uppercase">
                  {detail.city}
                </span>
              )}
            </div>
            <h1 className="mt-5 font-serif text-display font-light leading-[0.95] text-creme">
              {detail.name}
            </h1>
            {/* Note + prix NATIFS Hilmy (jamais Google) */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-creme">
              {detail.avg_rating !== null && (
                <span className="text-[13px] tracking-[0.18em] uppercase">
                  <span className="text-or">★</span> {formatRating(detail.avg_rating)}
                  <span className="text-creme/70">
                    {' · '}
                    {detail.nb_copines} {copineWord(detail.nb_copines)}
                  </span>
                </span>
              )}
              {detail.price_mode && (
                <span className="font-serif text-[15px] text-or">
                  {detail.price_mode}
                </span>
              )}
              {typeLabel && (
                <span className="text-[11px] text-creme/60 capitalize">
                  {typeLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.4fr_1fr] md:gap-20">
            {/* Main */}
            <div className="space-y-12">
              {detail.description && (
                <FadeInSection>
                  <header className="flex items-center gap-5">
                    <GoldLine width={60} />
                    <span className="overline text-or">Le lieu</span>
                  </header>
                  <p className="mt-6 font-serif text-[19px] font-light leading-[1.7] text-vert md:text-[21px]">
                    {detail.description}
                  </p>
                </FadeInSection>
              )}

              {galleryPhotos.length > 0 && (
                <FadeInSection>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {galleryPhotos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`${detail.name} — photo ${i + 2}`}
                        className={`w-full rounded-sm object-cover ${
                          galleryPhotos.length === 1 || i === 0
                            ? 'col-span-2 aspect-[16/9]'
                            : 'aspect-square'
                        }`}
                      />
                    ))}
                  </div>
                </FadeInSection>
              )}

              {communityPhotos.length > 0 && (
                <FadeInSection>
                  <CommunityPhotosSection
                    photos={communityPhotos}
                    canReport={false}
                    loginHref={signupHref}
                    placeName={detail.name}
                  />
                </FadeInSection>
              )}

              {recoViews.length > 0 && (
                <>
                  <FadeInSection>
                    <header className="flex items-center gap-5">
                      <GoldLine width={60} />
                      <span className="overline text-or">
                        Ce qu&apos;on en dit
                        {recoViews.length > 1 ? ` · ${recoViews.length} recos` : ''}
                      </span>
                    </header>
                  </FadeInSection>

                  <ul className="space-y-6">
                    {recoViews.map((r) => (
                      <li
                        key={r.reco_id}
                        className={`rounded-sm border border-or/15 bg-blanc ${
                          soloReco ? 'p-7 md:p-10' : 'p-6 md:p-8'
                        }`}
                      >
                        {/* En-tête ANONYME : « Une copine » + date, jamais de
                            prénom/avatar/statut (étanchéité publique). */}
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="h-10 w-10 rounded-full bg-creme-deep ring-1 ring-or/30"
                          />
                          <div>
                            <p className="text-[14px] font-medium text-vert">
                              Une copine
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
                          <p
                            className={`mt-5 font-serif italic leading-[1.7] text-texte ${
                              soloReco
                                ? 'text-[19px] md:text-[23px]'
                                : 'text-[16px] md:text-[17px]'
                            }`}
                          >
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
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* Sidebar */}
            <aside className="md:sticky md:top-28 md:self-start">
              <div className="rounded-sm border border-or/15 bg-creme-deep p-8">
                <p className="overline text-or">Où c&apos;est</p>
                <p className="mt-4 font-serif text-lg font-light text-vert">
                  {detail.address}
                </p>
                <div className="mt-5 h-px w-full bg-or/20" />
                <div className="mt-5 flex gap-2 text-[11px] text-texte-sec">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-or" />
                    Adresse via Google Maps
                  </span>
                </div>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
                >
                  Ouvrir dans Maps
                  <span className="text-or" aria-hidden="true">
                    →
                  </span>
                </a>

                {/* Teaser verrouillé horaires + téléphone (rendu ANONYME).
                    100% statique : aucun fetch, aucune interactivité — juste un
                    lien vers l'inscription. Le vrai bloc fonctionnel
                    (PlaceLiveInfo, appel Google au clic) reste connecté-only.
                    Aucun appel à /api/places/[id]/contact n'est possible d'ici. */}
                <div className="mt-6 border-t border-or/20 pt-6">
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-or"
                      aria-hidden="true"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p className="overline text-or">Horaires &amp; téléphone</p>
                  </div>
                  <p className="mt-3 text-[12px] leading-[1.6] text-texte-sec">
                    Réservés aux membres Hilmy.
                  </p>
                  <Link
                    href={signupHref}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
                  >
                    Connecte-toi pour voir les horaires et appeler
                    <span className="text-or" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </div>
              </div>

              {detail.nb_copines > 0 && (
                <div className="mt-6 rounded-sm border border-or/15 bg-blanc p-6">
                  <p className="overline text-or">
                    Recommandé par {detail.nb_copines} cop
                    {detail.nb_copines > 1 ? 'ines' : 'ine'}
                  </p>
                  <p className="mt-3 text-[12px] leading-[1.6] text-texte-sec">
                    Des femmes de la communauté Hilmy sont déjà passées par ici.
                  </p>
                </div>
              )}

              {/* CTA inscription (remplace Sauvegarder / Ajouter ma reco,
                  réservés aux membres). */}
              <div className="mt-6 rounded-sm border border-or/20 bg-vert p-8 text-creme">
                <p className="overline text-or">Rejoins le carnet</p>
                <p className="mt-4 text-[13px] leading-[1.65] text-creme/80">
                  Crée ton compte pour sauvegarder ce lieu, voir qui le
                  recommande et ajouter ta propre reco.
                </p>
                <Link
                  href={signupHref}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-or text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:bg-or-light"
                >
                  Créer mon compte
                  <span aria-hidden="true">→</span>
                </Link>
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
                <LieuCard key={s.place_slug} lieu={detailToMockLieu(s)} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}
