import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/landing/Navigation'
import { FooterV2 } from '@/components/landing/FooterV2'
import { GoldLine } from '@/components/ui/GoldLine'
import { CardOverlayGated } from '@/components/v2/CardOverlayGated'
import { PalierBadge } from '@/components/v2/PalierBadge'
import { PastilleSelectionHilmy } from '@/components/v2/PastilleSelectionHilmy'
import { categoriesPrestataires } from '@/lib/mock-data'
import {
  getPublicPrestataire,
  getPrestataireBySlug,
} from '@/lib/supabase/queries/prestataires'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = 'https://www.hilmy.io'

function catLabel(slug: string) {
  return categoriesPrestataires.find((c) => c.slug === slug)?.label ?? slug
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data } = await getPublicPrestataire(slug)
  if (!data) {
    return { title: 'Prestataire introuvable', robots: { index: false, follow: false } }
  }
  const nom = data.nom
  const cat = catLabel(data.categorie)
  const ville = data.ville ?? ''
  const title = `${nom} — ${cat}${ville ? ` à ${ville}` : ''}`
  const desc = (data.description ?? data.tagline ?? `${nom} sur Hilmy, l'annuaire des copines francophones.`).slice(0, 160)
  const photo = (data.photos && data.photos[0]) || '/images/hero.jpg'
  const canonical = `/prestataires/${slug}`
  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Hilmy`,
      description: desc,
      url: canonical,
      siteName: 'Hilmy',
      locale: 'fr_FR',
      type: 'profile',
      images: [{ url: photo, width: 1200, height: 630, alt: nom }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Hilmy`,
      description: desc,
      images: [photo],
    },
  }
}

function formatHoraires(h: Record<string, string> | null): { label: string; value: string }[] {
  if (!h || typeof h !== 'object') return []
  const order: [string, string][] = [
    ['monday', 'Lundi'],
    ['tuesday', 'Mardi'],
    ['wednesday', 'Mercredi'],
    ['thursday', 'Jeudi'],
    ['friday', 'Vendredi'],
    ['saturday', 'Samedi'],
    ['sunday', 'Dimanche'],
  ]
  return order
    .filter(([k]) => h[k])
    .map(([k, label]) => ({ label, value: String(h[k]) }))
}

function socialItems(p: { instagram: string | null; facebook: string | null; tiktok: string | null; youtube: string | null; linkedin: string | null; site_web: string | null }) {
  const items: { label: string; href: string }[] = []
  if (p.instagram) items.push({ label: 'Instagram', href: p.instagram.startsWith('http') ? p.instagram : `https://instagram.com/${p.instagram.replace(/^@/, '')}` })
  if (p.facebook) items.push({ label: 'Facebook', href: p.facebook.startsWith('http') ? p.facebook : `https://facebook.com/${p.facebook}` })
  if (p.tiktok) items.push({ label: 'TikTok', href: p.tiktok.startsWith('http') ? p.tiktok : `https://tiktok.com/@${p.tiktok.replace(/^@/, '')}` })
  if (p.youtube) items.push({ label: 'YouTube', href: p.youtube })
  if (p.linkedin) items.push({ label: 'LinkedIn', href: p.linkedin })
  if (p.site_web) items.push({ label: 'Site web', href: p.site_web })
  return items
}

export default async function PrestatairePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Public fetch (anon-safe — pas de whatsapp/email/phone_public/prendre_rdv_url)
  const { data: pub } = await getPublicPrestataire(slug)
  if (!pub) notFound()

  // Check session pour décider du rendu contacts/avis
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  // Si authentifié : fetch les coordonnées privées
  let priv: { whatsapp: string | null; email: string | null; phone_public: string | null; prendre_rdv_url: string | null } | null = null
  if (isAuthenticated) {
    const { data: full } = await getPrestataireBySlug(slug)
    if (full) {
      const f = full as unknown as { whatsapp?: string | null; email?: string | null; phone_public?: string | null; prendre_rdv_url?: string | null }
      priv = {
        whatsapp: f.whatsapp ?? null,
        email: f.email ?? null,
        phone_public: f.phone_public ?? null,
        prendre_rdv_url: f.prendre_rdv_url ?? null,
      }
    }
  }

  const photos = (pub.galerie && pub.galerie.length > 0 ? pub.galerie : pub.photos) ?? []
  const heroPhoto = photos[0] ?? '/images/hero.jpg'
  const horaires = formatHoraires(pub.horaires)
  const socials = socialItems(pub)
  const villeText = [pub.ville, pub.code_postal].filter(Boolean).join(' · ')
  const isCerclePro = pub.palier === 'cercle_pro'

  return (
    <div className="min-h-screen bg-creme text-texte">
      <Navigation variant="solid" />

      {/* Hero */}
      <header className="pt-28 pb-8 md:pt-36 md:pb-12">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-12">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm md:w-1/2">
              <Image src={heroPhoto} alt={pub.nom} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <GoldLine width={48} />
                <span className="overline text-or">{catLabel(pub.categorie)}</span>
              </div>
              <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.5rem)] font-light leading-[1.05] text-vert">
                {pub.nom}
              </h1>
              {pub.tagline && (
                <p className="mt-3 font-serif text-[18px] italic leading-snug text-vert/80 md:text-[20px]">
                  {pub.tagline}
                </p>
              )}
              {villeText && (
                <p className="mt-4 text-[14px] text-texte-sec">{villeText}</p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {isCerclePro && <PastilleSelectionHilmy />}
                <PalierBadge palier={pub.palier as 'standard' | 'premium' | 'cercle_pro'} size="medium" />
                {pub.nb_avis && pub.nb_avis > 0 && pub.note_moyenne ? (
                  <span className="rounded-full border border-or/40 px-4 py-1 text-[13px] text-vert">
                    ★ {pub.note_moyenne.toFixed(1)} · {pub.nb_avis} avis
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-24 md:pb-32">
        <div className="mx-auto max-w-container px-6 md:px-20">
          <div className="grid gap-12 md:grid-cols-3 md:gap-16">
            <div className="space-y-12 md:col-span-2">
              {/* À propos */}
              {pub.description && (
                <section>
                  <div className="flex items-center gap-4">
                    <GoldLine width={32} />
                    <h2 className="overline text-or">À propos</h2>
                  </div>
                  <p className="mt-4 whitespace-pre-line font-sans text-[16px] leading-[1.75] text-vert">
                    {pub.description}
                  </p>
                </section>
              )}

              {/* Services */}
              {pub.services && pub.services.length > 0 && (
                <section>
                  <div className="flex items-center gap-4">
                    <GoldLine width={32} />
                    <h2 className="overline text-or">Services</h2>
                  </div>
                  <ul className="mt-4 grid gap-2 md:grid-cols-2">
                    {pub.services.map((s: string, i: number) => (
                      <li key={i} className="rounded-sm border border-or/15 bg-blanc px-4 py-2 text-[14px] text-vert">
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Galerie photos (publique) */}
              {photos.length > 1 && (
                <section>
                  <div className="flex items-center gap-4">
                    <GoldLine width={32} />
                    <h2 className="overline text-or">Galerie</h2>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {photos.slice(1).map((src: string, i: number) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-sm">
                        <Image src={src} alt={`${pub.nom} — photo ${i + 2}`} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Avis — public count + détail gated */}
              <section id="avis">
                <div className="flex items-center gap-4">
                  <GoldLine width={32} />
                  <h2 className="overline text-or">Ce qu&apos;elles en disent</h2>
                </div>
                {pub.nb_avis && pub.nb_avis > 0 && pub.note_moyenne ? (
                  <p className="mt-4 font-serif text-[20px] italic leading-snug text-vert">
                    ★ {pub.note_moyenne.toFixed(1)} sur {pub.nb_avis} avis de copines
                  </p>
                ) : (
                  <p className="mt-4 text-[14px] italic text-texte-sec">
                    Pas encore d&apos;avis publié. Reviens bientôt&nbsp;!
                  </p>
                )}
                {isAuthenticated ? (
                  pub.nb_avis && pub.nb_avis > 0 ? (
                    <p className="mt-4 text-[13px] text-texte-sec">
                      Détail des avis disponible sur ta fiche dashboard et bientôt ici en
                      version enrichie.
                    </p>
                  ) : null
                ) : (
                  pub.nb_avis && pub.nb_avis > 0 ? (
                    <div className="mt-6">
                      <CardOverlayGated variant="avis" prestataireNom={pub.nom}>
                        <div className="space-y-3 p-6">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="rounded-sm border border-or/10 bg-creme-soft p-4">
                              <p className="text-[13px] font-medium text-vert">Sophie · ★★★★★</p>
                              <p className="mt-2 text-[14px] italic leading-snug text-vert/80">
                                Lorem ipsum dolor sit amet consectetur. Une copine en or, je
                                recommande à 100%.
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardOverlayGated>
                    </div>
                  ) : null
                )}
              </section>
            </div>

            <aside className="space-y-8">
              {/* Horaires (publics) */}
              {horaires.length > 0 && (
                <section className="rounded-sm border border-or/15 bg-blanc p-5">
                  <h3 className="overline text-or">Horaires</h3>
                  <dl className="mt-4 space-y-2 text-[13px]">
                    {horaires.map(({ label, value }) => (
                      <div key={label} className="flex justify-between gap-4">
                        <dt className="text-vert">{label}</dt>
                        <dd className="text-texte-sec">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {/* Réseaux sociaux (publics) */}
              {socials.length > 0 && (
                <section className="rounded-sm border border-or/15 bg-blanc p-5">
                  <h3 className="overline text-or">Réseaux</h3>
                  <ul className="mt-4 space-y-2">
                    {socials.map((s) => (
                      <li key={s.label}>
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex w-full items-center justify-between rounded-sm border border-or/15 bg-creme-soft px-4 py-2 text-[14px] text-vert transition-colors hover:border-or hover:bg-blanc"
                        >
                          <span>{s.label}</span>
                          <span aria-hidden="true" className="text-or">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Contact — gated derrière signup */}
              <section>
                <h3 className="overline mb-3 text-or">Contact</h3>
                {isAuthenticated && priv ? (
                  <div className="space-y-3 rounded-sm border border-or/15 bg-blanc p-5">
                    {priv.whatsapp && (
                      <a
                        href={`https://wa.me/${priv.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-full bg-or px-5 py-3 text-center text-[14px] font-semibold text-vert transition-all hover:bg-or-light"
                      >
                        WhatsApp · {priv.whatsapp}
                      </a>
                    )}
                    {priv.phone_public && (
                      <a
                        href={`tel:${priv.phone_public}`}
                        className="block rounded-full border border-or/40 px-5 py-3 text-center text-[14px] text-vert transition-colors hover:bg-creme-soft"
                      >
                        📞 {priv.phone_public}
                      </a>
                    )}
                    {priv.email && (
                      <a
                        href={`mailto:${priv.email}`}
                        className="block rounded-full border border-or/40 px-5 py-3 text-center text-[14px] text-vert transition-colors hover:bg-creme-soft"
                      >
                        ✉️ {priv.email}
                      </a>
                    )}
                    {priv.prendre_rdv_url && (
                      <a
                        href={priv.prendre_rdv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-full bg-vert px-5 py-3 text-center text-[14px] font-semibold text-creme transition-all hover:bg-vert-dark"
                      >
                        Prendre rendez-vous
                      </a>
                    )}
                    {!priv.whatsapp && !priv.phone_public && !priv.email && !priv.prendre_rdv_url && (
                      <p className="text-[13px] italic text-texte-sec">
                        Cette prestataire n&apos;a pas encore renseigné de canal de contact.
                      </p>
                    )}
                  </div>
                ) : (
                  <CardOverlayGated variant="contact" prestataireNom={pub.nom}>
                    <div className="space-y-3 p-5">
                      <div className="rounded-full bg-or px-5 py-3 text-center text-[14px] font-semibold text-vert">
                        WhatsApp · +33 6 XX XX XX XX
                      </div>
                      <div className="rounded-full border border-or/40 px-5 py-3 text-center text-[14px] text-vert">
                        ✉️ contact@masque...
                      </div>
                      <div className="rounded-full bg-vert px-5 py-3 text-center text-[14px] font-semibold text-creme">
                        Prendre rendez-vous
                      </div>
                    </div>
                  </CardOverlayGated>
                )}
              </section>

              {/* Link back vers annuaire */}
              <p className="text-center text-[13px] italic text-texte-sec">
                <Link href="/annuaire" className="hover:text-or">
                  ← Retour à l&apos;annuaire
                </Link>
              </p>
            </aside>
          </div>
        </div>
      </main>

      <FooterV2 />
    </div>
  )
}
