import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { FavoriteButton } from '@/components/v2/FavoriteButton'
import { TrackPlaceView } from '@/components/v2/TrackPlaceView'
import { PlaceContactLink } from '@/components/v2/PlaceContactLink'
import { MemberName } from '@/components/badges/MemberName'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { LieuCard } from '@/components/v2/LieuCard'
import { VideoPlayer } from '@/components/v2/VideoPlayer'
import { categoriesLieux, type Lieu as MockLieu } from '@/lib/mock-data'
import { isSelectionHilmy } from '@/lib/permissions-lieux'
import { formatRating, copineWord } from '@/lib/reco-format'
import type { GamificationStatut } from '@/lib/supabase/types'
import type { Place } from '@/lib/supabase/types'

export type RecoView = {
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
  statut: GamificationStatut | null
  isCopine: boolean | null
  copineSince: string | null
}

export type VideoEntry = {
  id: string
  videoUrl: string
  thumbnailUrl: string | null
  durationSeconds: number
}

function catLabel(slug: string) {
  return categoriesLieux.find((c) => c.slug === slug)?.label ?? slug
}

/**
 * Vue détail d'une recommandation (place + recos). Présentational : reçoit la
 * data déjà fetchée par la page server. Extrait depuis app/recommandation/[slug]
 * pour pouvoir être rendu aussi par un harnais de preview (data réelle).
 */
export function RecommandationDetail({
  l,
  row,
  recoViews,
  videoEntries,
  similaires,
  heroRating,
  heroNbCopines,
  heroPriceMode,
}: {
  l: MockLieu
  row: Place
  recoViews: RecoView[]
  videoEntries: VideoEntry[]
  similaires: MockLieu[]
  // Stats hero NATIVES Hilmy — lues depuis la MÊME source que la fiche
  // publique (vue place_public_detail) → valeur/format identiques à l'anon.
  heroRating: number | null
  heroNbCopines: number
  heroPriceMode: string | null
}) {
  // Photos réelles (http) du lieu. La 1re sert de cover (background hero) ;
  // les suivantes alimentent la galerie « Le lieu en images ». Les entrées
  // hex (#XXXXXX) ne sont pas des vraies photos — on les exclut de la galerie.
  const placePhotos = l.galerie.filter((u) => u.startsWith('http'))
  const coverIsPhoto = placePhotos.length > 0 && l.galerie[0] === placePhotos[0]
  const galleryPhotos = coverIsPhoto ? placePhotos.slice(1) : placePhotos
  const soloReco = recoViews.length === 1
  // Type lisible (catégorie Google), miroir exact de la fiche publique.
  const typeLabel = row.google_category
    ? row.google_category.replace(/_/g, ' ')
    : null

  return (
    <PageShell>
      <TrackPlaceView placeId={row.id} />
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
              {isSelectionHilmy(row) && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-creme px-3 py-1.5 font-serif text-[11px] font-light italic tracking-[0.2em] text-or shadow-[0_2px_8px_-2px_rgba(15,61,46,0.25)] uppercase backdrop-blur"
                  aria-label="Lieu Sélection Hilmy"
                >
                  <span aria-hidden="true">✨</span>
                  Sélection Hilmy
                </span>
              )}
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
            {/* Note + prix NATIFS Hilmy (jamais Google) — IDENTIQUE à la fiche
                publique : même source (place_public_detail), même format. */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-creme">
              {heroRating !== null && (
                <span className="text-[13px] tracking-[0.18em] uppercase">
                  <span className="text-or">★</span> {formatRating(heroRating)}
                  <span className="text-creme/70">
                    {' · '}
                    {heroNbCopines} {copineWord(heroNbCopines)}
                  </span>
                </span>
              )}
              {heroPriceMode && (
                <span className="font-serif text-[15px] text-or">
                  {heroPriceMode}
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

      {/* Section Vidéos — Sélection Hilmy uniquement (vidéos absentes
          sinon). Affiché juste après le hero pour mettre en avant le
          format pour les fiches premium. */}
      {videoEntries.length > 0 && (
        <section className="bg-creme-soft py-12 md:py-16">
          <div className="mx-auto max-w-container px-6 md:px-20">
            <FadeInSection>
              <header className="flex items-center gap-5">
                <GoldLine width={60} />
                <span className="overline text-or">
                  Découvre {l.nom} en vidéo
                </span>
              </header>
              {videoEntries.length === 1 ? (
                <div className="mt-6">
                  <VideoPlayer
                    videoUrl={videoEntries[0].videoUrl}
                    thumbnailUrl={videoEntries[0].thumbnailUrl}
                    durationSeconds={videoEntries[0].durationSeconds}
                    ariaLabel={`Voir la vidéo de ${l.nom}`}
                    fallbackColor={l.cover}
                    size="large"
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {videoEntries.map((v) => (
                    <VideoPlayer
                      key={v.id}
                      videoUrl={v.videoUrl}
                      thumbnailUrl={v.thumbnailUrl}
                      durationSeconds={v.durationSeconds}
                      ariaLabel={`Voir la vidéo de ${l.nom}`}
                      fallbackColor={l.cover}
                      size="medium"
                    />
                  ))}
                </div>
              )}
            </FadeInSection>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.4fr_1fr] md:gap-20">
            {/* Main : le lieu + les recommandations */}
            <div className="space-y-12">
              {/* Bloc « Le lieu » — description éditoriale du lieu. Rend la
                  colonne pleine même avec une seule reco. Masqué si pas de
                  description en base (mode dégradé propre). */}
              {l.description && (
                <FadeInSection>
                  <header className="flex items-center gap-5">
                    <GoldLine width={60} />
                    <span className="overline text-or">Le lieu</span>
                  </header>
                  <p className="mt-6 font-serif text-[19px] font-light leading-[1.7] text-vert md:text-[21px]">
                    {l.description}
                  </p>
                </FadeInSection>
              )}

              {/* Galerie photos du lieu (hors cover). Mosaïque : 1re photo en
                  grand, le reste en vignettes. Donne du corps visuel à la page. */}
              {galleryPhotos.length > 0 && (
                <FadeInSection>
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {galleryPhotos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt={`${l.nom} — photo ${i + 2}`}
                        className={`w-full rounded-sm object-cover ${
                          galleryPhotos.length === 1
                            ? 'col-span-2 aspect-[16/9]'
                            : i === 0
                              ? 'col-span-2 aspect-[16/9]'
                              : 'aspect-square'
                        }`}
                      />
                    ))}
                  </div>
                </FadeInSection>
              )}

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
                      className={`rounded-sm border border-or/15 bg-blanc ${
                        soloReco ? 'p-7 md:p-10' : 'p-6 md:p-8'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-10 w-10 rounded-full ring-1 ring-or/30"
                          style={{ background: r.avatar }}
                        />
                        <div>
                          <p className="text-[14px] font-medium text-vert">
                            <MemberName
                              prenom={r.prenom}
                              isCopine={r.isCopine}
                              copineSince={r.copineSince}
                            />
                            {r.statut && (
                              <span
                                className={`ml-1.5 font-serif text-[13px] italic font-light ${
                                  r.statut === 'Nouvelle'
                                    ? 'text-texte-sec/70'
                                    : 'text-or'
                                }`}
                              >
                                · {r.statut}
                              </span>
                            )}
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
                <PlaceContactLink
                  href={`https://maps.google.com/?q=${encodeURIComponent(l.adresse)}`}
                  placeId={row.id}
                  contactType="google_maps"
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-blanc"
                >
                  Ouvrir dans Maps
                  <span className="text-or" aria-hidden="true">
                    →
                  </span>
                </PlaceContactLink>
                <div className="mt-3 flex flex-col gap-3">
                  <FavoriteButton
                    itemType="lieu"
                    itemId={row.id}
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
                  {/* Texte simple, pas de pastille : en attendant les profils
                      publics (Lot B), ce bloc ne doit PAS paraître cliquable.
                      Aucun lien, aucun pointer — cursor-default explicite. */}
                  <div className="mt-4 flex cursor-default flex-col gap-3">
                    {recoViews.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-or/30"
                          style={{ background: r.avatar }}
                        />
                        <span className="text-[12px] font-medium text-vert">
                          <MemberName
                            prenom={r.prenom}
                            isCopine={r.isCopine}
                            copineSince={r.copineSince}
                            badgeSize={10}
                          />
                          {r.statut && (
                            <span
                              className={`ml-1 font-serif text-[11px] italic font-light ${
                                r.statut === 'Nouvelle'
                                  ? 'text-texte-sec/70'
                                  : 'text-or'
                              }`}
                            >
                              · {r.statut}
                            </span>
                          )}
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
