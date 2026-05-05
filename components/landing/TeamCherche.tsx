import Link from 'next/link'
import { GoldLine } from '@/components/ui/GoldLine'
import { CATEGORIES_MAP } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { getDemandesForHomeCarousel } from '@/lib/supabase/je-cherche'
import type { DemandeWithProfile } from '@/lib/types/je-cherche'

const CATEGORY_LABELS: Record<string, string> = {
  ...CATEGORIES_MAP,
  autre: 'Autre',
}

function locationLabel(d: { canton: string | null; city: string | null; country: string }): string {
  if (d.city) return d.city
  if (d.canton) return d.canton
  return d.country
}

function initial(prenom: string | null): string {
  if (!prenom || prenom.length === 0) return '·'
  return prenom.charAt(0).toUpperCase()
}

/**
 * Capitalize première lettre d'un prénom (le reste en lowercase) — fix
 * pour les profils stockés en minuscule (héritage signup historique).
 * Fallback "la copine" si vide/null.
 */
function capitalizeFirstName(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'la copine'
  const trimmed = name.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/**
 * Formate le titre d'une demande pour l'affichage card "Cherche / [titre]".
 *
 * Le champ `title` BDD peut être saisi de 2 façons selon l'ancienneté :
 *   - Ancien (avant PR #65) : "Décoratrice" (juste l'objet, pas d'article)
 *   - Nouveau (depuis PR #65) : "Une décoratrice" (article inclus)
 *
 * Cette fonction garantit un rendu cohérent "une décoratrice" quel que
 * soit le format BDD :
 *   - Si commence déjà par un article (Un/Une/Des/Le/La/Les/L') → garde
 *     tel quel, juste lowercase la 1ère lettre.
 *   - Sinon : déduit l'article via heuristique terminaison française
 *     (-e, -trice, -euse, -ière, -esse → féminin "une", sinon "un").
 *
 * V1.0 : heuristique imparfaite (français = piège). À itérer V1.5 avec
 * un champ "gender" optionnel sur la table demandes ou une liste de
 * mots connus.
 */
function formatTitle(rawTitle: string): string {
  const trimmed = rawTitle.trim()
  if (trimmed.length === 0) return ''

  // 1. Détection article déjà présent
  const articlePattern = /^(une?|des|les?|la|l['’])\s/i
  if (articlePattern.test(trimmed)) {
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
  }

  // 2. Heuristique genre par terminaison
  const feminineEndings = /(trice|euse|ière|esse|e)$/i
  const article = feminineEndings.test(trimmed) ? 'une' : 'un'
  const lowercased = trimmed.charAt(0).toLowerCase() + trimmed.slice(1)
  return `${article} ${lowercased}`
}

/**
 * Cards démo statiques pour la home publique (variant="public").
 * Aucune info perso (pas de prénom réel, pas d'avatar, pas de timestamp
 * relatif) — juste un teaser pour donner envie de s'inscrire.
 *
 * Toutes les variantes "publiques" du composant pointent vers /auth/signup,
 * pas vers les vraies demandes (fonctionnalité réservée aux inscrites).
 */
const DEMO_CARDS_PUBLIC: {
  id: string
  category: string
  title: string
  city: string
}[] = [
  {
    id: 'demo-1',
    category: 'maison',
    title: 'Une copine cherche une décoratrice',
    city: 'Genève',
  },
  {
    id: 'demo-2',
    category: 'evenementiel',
    title: 'Une copine cherche un photographe mariage',
    city: 'Lausanne',
  },
  {
    id: 'demo-3',
    category: 'beaute',
    title: 'Une copine cherche un coiffeur curly',
    city: 'Annemasse',
  },
  {
    id: 'demo-4',
    category: 'sport-nutrition',
    title: 'Une copine cherche une coach sportive',
    city: 'Fribourg',
  },
]

interface TeamCherchePropsBase {
  /**
   * - "connected" (default) : fetch les vraies demandes via Supabase,
   *   tous les CTAs pointent vers /je-cherche.
   * - "public" : 4 cards démo statiques sans info perso, tous les CTAs
   *   pointent vers /auth/signup. Aucun fetch Supabase.
   */
  variant?: 'connected' | 'public'
}

/**
 * Section home : carrousel horizontal "La team cherche…".
 *
 * Mode "connected" : 4 demandes triées urgent > created_at, dernière card
 * = CTA poster une demande. Affiche prénoms réels + villes.
 *
 * Mode "public" : 4 cards démo anonymisées + tous les CTAs vers /auth/signup
 * (la fonctionnalité Je cherche est réservée aux inscrites).
 */
export async function TeamCherche({ variant = 'connected' }: TeamCherchePropsBase = {}) {
  if (variant === 'public') return <TeamCherchePublic />
  return <TeamCherchePrivate />
}

/* ─────────────────────────────────────────────────────────────────────
 * Variant "connected" — vraies données Supabase, CTAs vers /je-cherche
 * ─────────────────────────────────────────────────────────────────── */
async function TeamCherchePrivate() {
  const result = await getDemandesForHomeCarousel()
  const demandes: DemandeWithProfile[] = result.ok ? result.data : []

  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={48} />
              <span className="overline text-or">Le feed des copines</span>
            </div>
            <h2 className="mt-5 font-serif text-h2 font-light leading-[1.05] text-vert">
              La team{' '}
              <em className="italic text-or">cherche</em>
              <span className="text-or">…</span>
            </h2>
            {/* Intro module : explique en une ligne ce qu'on peut faire ici. */}
            <p className="mt-4 text-[14px] leading-[1.55] text-vert/70 md:text-[15px]">
              Tu cherches une adresse&nbsp;? Demande à la team.
            </p>
          </div>
          <Link
            href="/je-cherche"
            className="group inline-flex items-center gap-2 self-start text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or md:self-auto"
          >
            Voir tout
            <span className="text-or transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        {/* Carrousel scroll-snap */}
        <div className="mt-8 -mx-6 md:-mx-20">
          <ul
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:px-20 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Demandes récentes des copines"
          >
            {demandes.map((d) => {
              const isUrgent = d.urgency === 'urgent' && d.status === 'open'
              const ctaLabel =
                d.response_count > 0
                  ? `${d.response_count} réponse${d.response_count > 1 ? 's' : ''} · Réponds aussi →`
                  : `Réponds à ${capitalizeFirstName(d.prenom)} →`
              const ctaIsOutline = d.response_count > 0
              return (
                <li key={d.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
                  <Link
                    href={`/je-cherche/${d.id}`}
                    className="group flex h-full flex-col rounded-sm border border-or/15 bg-blanc p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-or/40 hover:shadow-[0_16px_32px_-20px_rgba(15,61,46,0.25)]"
                    aria-label={`Demande de ${d.prenom ?? 'une copine'} — ${d.title}. Cliquer pour répondre.`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-creme-deep">
                        {d.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-full w-full items-center justify-center font-serif text-[14px] font-light text-or">
                            {initial(d.prenom)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-vert">
                          {d.prenom ?? 'Une copine'}
                        </p>
                        <p className="truncate text-[10px] text-texte-sec">
                          {locationLabel(d)} · {formatRelativeTime(d.created_at)}
                        </p>
                      </div>
                      {isUrgent && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-[#D4847A]/15 px-2 py-0.5 text-[9px] font-medium tracking-[0.18em] text-[#A85C50] uppercase">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[9px] tracking-[0.22em] text-or-deep uppercase">
                      {CATEGORY_LABELS[d.category] ?? d.category}
                    </p>
                    {/* Titre 2 lignes étagées : "Cherche" en italique or
                        plus petit (joue le rôle d'eyebrow contextuel) +
                        ligne 2 dominante avec article auto via formatTitle
                        (gère titres BDD avec OU sans article — héritage
                        avant le form /je-cherche/nouvelle PR #65). */}
                    <h3 className="mt-1.5 font-serif font-light leading-tight">
                      <span className="block text-[14px] italic text-or md:text-[15px]">
                        Cherche
                      </span>
                      <span className="mt-0.5 block text-[20px] text-vert break-words line-clamp-2 md:text-[22px]">
                        {formatTitle(d.title)}
                      </span>
                    </h3>
                    <div className="mt-auto pt-4">
                      <span
                        className={`flex w-full items-center justify-center rounded-full px-4 py-2.5 text-[12px] font-medium transition-colors ${
                          ctaIsOutline
                            ? 'border border-vert text-vert group-hover:bg-vert group-hover:text-creme'
                            : 'bg-vert text-creme group-hover:bg-vert-dark'
                        }`}
                      >
                        {ctaLabel}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}

            {/* Card CTA finale : poster une demande (intacte vs spec) */}
            <li className="w-[260px] shrink-0 snap-start sm:w-[280px]">
              <Link
                href="/je-cherche/nouvelle"
                className="group flex h-full flex-col items-center justify-center gap-4 rounded-sm bg-vert p-6 text-center text-creme transition-all duration-300 hover:-translate-y-0.5 hover:bg-vert-dark"
              >
                <span className="overline text-or">À toi</span>
                <p className="font-serif text-[20px] font-light italic leading-tight text-creme">
                  Demande à la team
                </p>
                <p className="text-[12px] leading-[1.55] text-creme/80">
                  On a forcément l&apos;adresse.
                </p>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-or/40 px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-or uppercase transition-all group-hover:bg-or group-hover:text-vert">
                  + Poster ma demande
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────
 * Variant "public" — cards démo statiques anonymisées, CTAs vers signup
 * ─────────────────────────────────────────────────────────────────── */
function TeamCherchePublic() {
  const SIGNUP_HREF = '/auth/signup'

  return (
    <section className="bg-creme py-20 md:py-28">
      <div className="mx-auto max-w-container px-6 md:px-20">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <GoldLine width={48} />
              <span className="overline text-or">Le feed des copines</span>
            </div>
            <h2 className="mt-5 font-serif text-h2 font-light leading-[1.05] text-vert">
              La team{' '}
              <em className="italic text-or">cherche</em>
              <span className="text-or">…</span>
            </h2>
          </div>
          <Link
            href={SIGNUP_HREF}
            className="group inline-flex items-center gap-2 self-start text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or md:self-auto"
          >
            Voir tout
            <span className="text-or transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        <div className="mt-10 -mx-6 md:-mx-20">
          <ul
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:px-20 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Aperçu des demandes des copines"
          >
            {DEMO_CARDS_PUBLIC.map((d) => (
              <li key={d.id} className="w-[260px] shrink-0 snap-start sm:w-[280px]">
                <Link
                  href={SIGNUP_HREF}
                  className="group flex h-full flex-col rounded-sm border border-or/15 bg-blanc p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-or/40 hover:shadow-[0_16px_32px_-20px_rgba(15,61,46,0.25)]"
                  aria-label="Rejoindre la team pour voir cette demande"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-creme-deep"
                      aria-hidden="true"
                    >
                      <span className="flex h-full w-full items-center justify-center font-serif text-[14px] font-light text-or">
                        ·
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-vert">
                        Une copine
                      </p>
                      <p className="truncate text-[10px] text-texte-sec">
                        {d.city}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[9px] tracking-[0.22em] text-or-deep uppercase">
                    {CATEGORY_LABELS[d.category] ?? d.category}
                  </p>
                  <h3 className="mt-1.5 line-clamp-3 font-serif text-[16px] font-light leading-tight text-vert break-words">
                    {d.title}
                  </h3>
                  <div className="mt-auto pt-4 text-[11px] font-medium text-or">
                    Rejoindre pour voir →
                  </div>
                </Link>
              </li>
            ))}

            {/* Card CTA finale : signup */}
            <li className="w-[260px] shrink-0 snap-start sm:w-[280px]">
              <Link
                href={SIGNUP_HREF}
                className="group flex h-full flex-col items-center justify-center gap-4 rounded-sm bg-vert p-6 text-center text-creme transition-all duration-300 hover:-translate-y-0.5 hover:bg-vert-dark"
              >
                <span className="overline text-or">À toi</span>
                <p className="font-serif text-[20px] font-light italic leading-tight text-creme">
                  Demande à la team
                </p>
                <p className="text-[12px] leading-[1.55] text-creme/80">
                  On a forcément l&apos;adresse.
                </p>
                <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-or/40 px-4 py-2 text-[10px] font-medium tracking-[0.22em] text-or uppercase transition-all group-hover:bg-or group-hover:text-vert">
                  + Poster ma demande
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
