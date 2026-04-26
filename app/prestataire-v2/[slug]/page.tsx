import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { PageShell } from '@/components/v2/PageShell'
import { FavoriteButton } from '@/components/v2/FavoriteButton'
import { GoldLine } from '@/components/ui/GoldLine'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { PrestataireCard } from '@/components/v2/PrestataireCard'
import { PhotoGallery } from '@/components/v2/PhotoGallery'
import { SocialChannelsButtons } from '@/components/v2/SocialChannelsButtons'
import { TrackPageView } from '@/components/v2/TrackPageView'
import { AvisSection, type AvisItem } from '@/components/v2/AvisSection'
import {
  categoriesPrestataires,
  type Prestataire as MockPrestataire,
} from '@/lib/mock-data'
import {
  getPrestataireBySlug,
  getPrestatairesByCategorie,
} from '@/lib/supabase/queries/prestataires'
import { createClient } from '@/lib/supabase/server'
import type { Prestataire as DbPrestataire } from '@/lib/supabase/types'

type AvisRow = {
  id: string
  comment: string | null
  rating: number | null
  created_at: string
  reponse_pro: string | null
  reponse_date: string | null
  user: { prenom: string | null; avatar_url: string | null } | null
}

function catLabel(slug: string) {
  return categoriesPrestataires.find((c) => c.slug === slug)?.label ?? slug
}

function devise(ville: string) {
  return ['Paris', 'Lyon', 'Bruxelles', 'Luxembourg', 'Monaco'].includes(ville)
    ? '€'
    : 'CHF'
}

function adaptDbPrestataire(p: DbPrestataire): MockPrestataire {
  const galerie =
    Array.isArray(p.galerie) && p.galerie.length > 0
      ? (p.galerie as string[])
      : Array.isArray(p.photos) && p.photos.length > 0
        ? p.photos
        : []
  const cover =
    galerie[0] && galerie[0].startsWith('#') ? galerie[0] : '#D4C5B0'
  return {
    slug: p.slug,
    nom: p.nom,
    metier: catLabel(p.categorie),
    categorie: p.categorie,
    ville: p.ville,
    note: p.note_moyenne ?? 0,
    avis: p.nb_avis ?? 0,
    prix: (p.prix_gamme as '€' | '€€' | '€€€') ?? '€€',
    cover,
    tagline: p.tagline ?? '',
    bio: p.description ?? '',
    services: Array.isArray(p.services) ? p.services : [],
    galerie,
    tarifsDe: p.prix_from ?? 0,
    email: p.email ?? undefined,
    telephone: p.whatsapp ?? undefined,
    instagram: p.instagram ?? undefined,
  }
}

export default async function PrestatairePage({
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
    redirect(`/auth/signup?redirect=/prestataire-v2/${encodeURIComponent(slug)}`)
  }

  const { data: row, error } = await getPrestataireBySlug(slug)
  if (error || !row) notFound()
  const p: MockPrestataire = adaptDbPrestataire(row)

  const [
    { data: rowsSim },
    avisRes,
  ] = await Promise.all([
    getPrestatairesByCategorie(row.categorie),
    supabase
      .from('recommendations')
      .select(
        'id, comment, rating, created_at, reponse_pro, reponse_date, user:user_profiles ( prenom, avatar_url )',
      )
      .eq('profile_id', row.id)
      .eq('type', 'prestataire')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const similaires: MockPrestataire[] = (rowsSim ?? [])
    .filter((x) => x.slug !== slug)
    .slice(0, 3)
    .map(adaptDbPrestataire)

  const rawAvis = ((avisRes.data ?? []) as unknown as AvisRow[]).map((a) => ({
    ...a,
    user: Array.isArray(a.user) ? a.user[0] : a.user,
  }))

  const isOwner = !!user && user.id === row.user_id
  const isAuthenticated = !!user

  // Enrichir les avis avec likes_count + liked_by_me
  let avisForSection: AvisItem[] = []
  if (rawAvis.length > 0) {
    const avisIds = rawAvis.map((a) => a.id)
    const { data: likesRows } = await supabase
      .from('recommendation_likes')
      .select('recommendation_id, user_id')
      .in('recommendation_id', avisIds)
    const likes = likesRows ?? []
    const countByReco: Record<string, number> = {}
    const likedByMe: Set<string> = new Set()
    for (const l of likes) {
      countByReco[l.recommendation_id] = (countByReco[l.recommendation_id] ?? 0) + 1
      if (user && l.user_id === user.id) likedByMe.add(l.recommendation_id)
    }
    avisForSection = rawAvis.map((a) => ({
      id: a.id,
      comment: a.comment,
      rating: a.rating,
      created_at: a.created_at,
      reponse_pro: a.reponse_pro,
      reponse_date: a.reponse_date,
      user: a.user,
      likes_count: countByReco[a.id] ?? 0,
      liked_by_me: likedByMe.has(a.id),
    }))
  }

  return (
    <PageShell>
      <TrackPageView profileId={row.id} />
      {/* Hero */}
      <section
        className="relative overflow-hidden pt-28 pb-20 md:pt-36 md:pb-24"
        style={
          p.galerie[0] && p.galerie[0].startsWith('http')
            ? {
                backgroundImage: `linear-gradient(165deg, rgba(15,61,46,0.35) 0%, rgba(245,240,230,0.75) 100%), url(${p.galerie[0]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                background: `linear-gradient(165deg, ${p.cover} 0%, ${p.galerie[0] ?? p.cover} 50%, #F5F0E6 100%)`,
              }
        }
      >
        <div className="absolute inset-0 bg-grain opacity-[0.08]" />
        <div className="relative mx-auto max-w-container px-6 md:px-20">
          <Link
            href="/annuaire"
            className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or"
          >
            <span
              className="text-or transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            >
              ←
            </span>
            Retour à l&apos;annuaire
          </Link>

          <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-20">
            <div>
              <div className="flex items-center gap-4">
                <GoldLine width={48} />
                <span className="overline text-or-deep">
                  {catLabel(p.categorie)} · {p.ville}
                </span>
              </div>
              <h1 className="mt-6 font-serif text-display font-light leading-[0.95] text-vert">
                {p.nom}
              </h1>
              <p className="mt-6 max-w-xl font-serif text-[20px] italic leading-[1.4] text-texte md:text-[22px]">
                « {p.tagline} »
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-1.5 text-[13px] font-medium text-vert">
                  <span className="text-or">★</span>
                  {p.note.toFixed(1)}
                  <span className="text-texte-sec">
                    · {p.avis} avis
                  </span>
                </div>
                <span className="h-4 w-px bg-or/30" />
                <span className="text-[13px] text-texte-sec">
                  Dès {p.tarifsDe} {devise(p.ville)}
                </span>
                <span className="h-4 w-px bg-or/30" />
                <span className="inline-flex items-center gap-2 rounded-full bg-vert/10 px-3 py-1 text-[11px] font-medium text-vert">
                  <span className="h-1.5 w-1.5 rounded-full bg-or" />
                  Profil vérifié
                </span>
              </div>
            </div>

            <div className="rounded-sm border border-or/20 bg-blanc/85 p-6 shadow-[0_30px_60px_-40px_rgba(15,61,46,0.3)] backdrop-blur md:p-8">
              <p className="overline text-or">La contacter</p>
              <div className="mt-4">
                <SocialChannelsButtons
                  values={{
                    whatsapp: row.whatsapp,
                    phone_public: row.phone_public,
                    email: row.email,
                    instagram: row.instagram,
                    tiktok: row.tiktok,
                    linkedin: row.linkedin,
                    facebook: row.facebook,
                    youtube: row.youtube,
                    site_web: row.site_web,
                  }}
                  variant="stack"
                  profileId={row.id}
                />
              </div>
              <div className="mt-6">
                <FavoriteButton />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-16 md:grid-cols-[1.3fr_1fr] md:gap-20">
            {/* Left: bio + services + avis */}
            <div className="space-y-16">
              <FadeInSection>
                <header className="flex items-center gap-5">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    01
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">À propos</span>
                </header>
                <p className="mt-6 font-serif text-[19px] italic leading-[1.6] text-texte md:text-[20px]">
                  {p.bio}
                </p>
              </FadeInSection>

              <FadeInSection>
                <header className="flex items-center gap-5">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    02
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">Services</span>
                </header>
                <ul className="mt-6 divide-y divide-or/15 rounded-sm border border-or/15 bg-blanc">
                  {p.services.map((s) => (
                    <li
                      key={s.nom}
                      className="flex flex-col gap-1 px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-serif text-lg text-vert">{s.nom}</p>
                        <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
                          {s.duree}
                        </p>
                      </div>
                      <p className="font-serif text-xl italic text-or-deep">{s.prix}</p>
                    </li>
                  ))}
                </ul>
              </FadeInSection>

              {p.galerie.length > 0 && (
                <FadeInSection>
                  <header className="flex items-center gap-5">
                    <span className="font-serif text-[44px] font-light leading-none text-or">
                      03
                    </span>
                    <GoldLine width={60} />
                    <span className="overline text-or">Galerie</span>
                  </header>
                  <div className="mt-6">
                    <PhotoGallery items={p.galerie} ariaLabel={`Galerie ${p.nom}`} />
                  </div>
                </FadeInSection>
              )}

              <FadeInSection>
                <header className="flex items-center gap-5" id="avis">
                  <span className="font-serif text-[44px] font-light leading-none text-or">
                    04
                  </span>
                  <GoldLine width={60} />
                  <span className="overline text-or">
                    Ce qu&apos;elles en disent
                  </span>
                </header>

                <AvisSection
                  profileId={row.id}
                  profileSlug={slug}
                  profileNom={p.nom}
                  isOwner={isOwner}
                  isAuthenticated={isAuthenticated}
                  initialAvis={avisForSection}
                />
              </FadeInSection>
            </div>

            {/* Right: sticky sidebar */}
            <aside className="md:sticky md:top-28 md:self-start">
              <div className="rounded-sm border border-or/15 bg-creme-deep p-8">
                <p className="overline text-or">En bref</p>
                <dl className="mt-6 space-y-4 text-[13px]">
                  <div className="flex items-center justify-between border-b border-or/10 pb-3">
                    <dt className="text-texte-sec">Catégorie</dt>
                    <dd className="font-medium text-vert">{catLabel(p.categorie)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-or/10 pb-3">
                    <dt className="text-texte-sec">Ville</dt>
                    <dd className="font-medium text-vert">{p.ville}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-or/10 pb-3">
                    <dt className="text-texte-sec">Gamme de prix</dt>
                    <dd className="font-medium text-vert">{p.prix}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-or/10 pb-3">
                    <dt className="text-texte-sec">Première séance</dt>
                    <dd className="font-medium text-vert">
                      {p.tarifsDe} {devise(p.ville)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-texte-sec">Note moyenne</dt>
                    <dd className="font-medium text-vert">
                      ★ {p.note.toFixed(1)} / 5
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 rounded-sm border border-or/20 bg-vert p-8 text-creme">
                <p className="overline text-or">Avant d&apos;y aller</p>
                <p className="mt-4 text-[13px] leading-[1.65] text-creme/80">
                  Dis-lui que tu viens de HILMY en prenant ton rendez-vous. Rien
                  d&apos;obligatoire — c&apos;est juste un code entre nous.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Similar */}
      {similaires.length > 0 && (
        <section className="bg-blanc py-20 md:py-28">
          <div className="mx-auto max-w-container px-6 md:px-20">
            <FadeInSection>
              <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <div className="flex items-center gap-4">
                    <GoldLine width={48} />
                    <span className="overline text-or">À explorer aussi</span>
                  </div>
                  <h2 className="mt-4 font-serif text-h2 font-light text-vert">
                    Dans la même catégorie.
                  </h2>
                </div>
                <Link
                  href={`/annuaire`}
                  className="group inline-flex items-center gap-2 text-[13px] font-medium text-vert hover:text-or transition-colors"
                >
                  Voir tout l&apos;annuaire
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
                <PrestataireCard key={s.slug} p={s} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}
