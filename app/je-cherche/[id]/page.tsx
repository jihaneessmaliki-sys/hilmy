import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PageShell } from '@/components/v2/PageShell'
import { GoldLine } from '@/components/ui/GoldLine'
import {
  getDemandeById,
  getDemandeResponsesByDemandeId,
} from '@/lib/supabase/je-cherche'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES_MAP } from '@/lib/constants'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { DemandeActions } from './_components/DemandeActions'
import { ResponseRow } from './_components/ResponseRow'
import { ResponseForm } from './_components/ResponseForm'

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

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const result = await getDemandeById(id)
  if (!result.ok || !result.data) {
    return { title: 'Demande introuvable — Hilmy' }
  }
  const d = result.data
  return {
    title: `${d.title} — Je cherche · Hilmy`,
    description: d.content.slice(0, 160),
    openGraph: {
      title: d.title,
      description: d.content.slice(0, 200),
    },
  }
}

export default async function DemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const demandeResult = await getDemandeById(id)
  if (!demandeResult.ok) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl px-6 py-32 text-center">
          <p className="font-serif text-2xl text-vert">Petit pépin.</p>
          <p className="mt-3 text-[14px] text-texte-sec">{demandeResult.error}</p>
        </section>
      </PageShell>
    )
  }
  if (!demandeResult.data) notFound()
  const demande = demandeResult.data

  const responsesResult = await getDemandeResponsesByDemandeId(id)
  const responses = responsesResult.ok ? responsesResult.data : []

  // Auth state pour : determiner owner, gérer le form, signup redirect
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = !!user && user.id === demande.user_id
  const isAuthenticated = !!user

  // Liste des responses likées par moi (pour pre-render le bouton Merci)
  let myThanks: Set<string> = new Set()
  if (user && responses.length > 0) {
    const { data: thanks } = await supabase
      .from('demande_response_thanks')
      .select('response_id')
      .eq('user_id', user.id)
      .in(
        'response_id',
        responses.map((r) => r.id),
      )
    myThanks = new Set((thanks ?? []).map((t) => t.response_id as string))
  }

  const isUrgent = demande.urgency === 'urgent' && demande.status === 'open'
  const signupUrl = `/auth/signup?redirect=${encodeURIComponent(`/je-cherche/${demande.id}`)}`

  return (
    <PageShell>
      {/* Top bar mobile-friendly */}
      <section className="border-b border-or/10 bg-creme/85 pt-24 pb-3 backdrop-blur md:pt-28">
        <div className="mx-auto max-w-2xl px-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/je-cherche"
              className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:text-or"
            >
              <span className="text-or" aria-hidden="true">←</span>
              Retour
            </Link>
            <span className="text-[10px] tracking-[0.28em] text-or-deep uppercase">
              Demande
            </span>
            <DemandeActions
              demandeId={demande.id}
              isOwner={isOwner}
              status={demande.status}
            />
          </div>
        </div>
      </section>

      {/* Card demande */}
      <section className="px-4 py-8 sm:px-6 md:py-12">
        <article className="mx-auto max-w-2xl rounded-sm border border-or/15 bg-blanc p-6 md:p-8">
          <header className="flex items-start gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-creme-deep">
              {demande.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={demande.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-full w-full items-center justify-center font-serif text-[18px] font-light text-or"
                >
                  {initial(demande.prenom)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-vert">
                {demande.prenom ?? 'Une copine'}
              </p>
              <p className="text-[12px] text-texte-sec">
                {locationLabel(demande)} ·{' '}
                {formatRelativeTime(demande.created_at)}
              </p>
            </div>
            {isUrgent && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-[#D4847A]/15 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] text-[#A85C50] uppercase">
                Urgent
              </span>
            )}
          </header>

          <p className="mt-5 text-[10px] tracking-[0.22em] text-or-deep uppercase">
            {CATEGORY_LABELS[demande.category] ?? demande.category}
          </p>
          <h1 className="mt-2 font-serif text-[26px] font-light leading-tight text-vert break-words md:text-[32px]">
            {demande.title}
          </h1>
          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-[1.7] text-texte break-words">
            {demande.content}
          </p>

          {demande.status === 'resolved' && (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-vert/10 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-vert uppercase">
              <span aria-hidden="true">✓</span>
              Trouvé grâce aux copines
            </p>
          )}
        </article>
      </section>

      {/* Section responses */}
      <section className="bg-blanc px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            <GoldLine width={40} />
            <span className="overline text-or">
              Les recos de la team — {demande.response_count}
            </span>
          </div>

          {responses.length === 0 ? (
            <div className="rounded-sm border border-dashed border-or/30 bg-creme-soft py-12 text-center">
              <p className="font-serif text-lg italic text-vert">
                Pas encore de reco.
              </p>
              <p className="mt-2 text-[13px] text-texte-sec">
                Sois la première à aider {demande.prenom ?? 'cette copine'}.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {responses.map((r) => (
                <li key={r.id}>
                  <ResponseRow
                    response={r}
                    demandeId={demande.id}
                    thanked={myThanks.has(r.id)}
                    isOwn={!!user && user.id === r.user_id}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Bottom sticky form */}
      <ResponseForm
        demandeId={demande.id}
        isAuthenticated={isAuthenticated}
        signupUrl={signupUrl}
      />
    </PageShell>
  )
}
