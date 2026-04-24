'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type ReportRow = {
  id: string
  recommendation_id: string
  reason: string | null
  status: string
  created_at: string
  reco: {
    id: string
    comment: string | null
    rating: number | null
    status: string
    type: 'place' | 'prestataire'
    profile?: { nom: string; slug: string } | { nom: string; slug: string }[] | null
    place?: { name: string; slug: string | null } | { name: string; slug: string | null }[] | null
  } | null
  reporter: {
    prenom: string | null
  } | null
}

export function ReportRow({ report }: { report: ReportRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const profile = Array.isArray(report.reco?.profile)
    ? report.reco?.profile[0]
    : report.reco?.profile
  const place = Array.isArray(report.reco?.place)
    ? report.reco?.place[0]
    : report.reco?.place

  const target =
    report.reco?.type === 'prestataire'
      ? `Prestataire ${profile?.nom ?? ''}`
      : `Lieu ${place?.name ?? ''}`
  const targetLink =
    report.reco?.type === 'prestataire' && profile?.slug
      ? `/prestataire-v2/${profile.slug}#avis`
      : place?.slug
        ? `/recommandation/${place.slug}`
        : null

  const resolveReport = async (action: 'remove_reco' | 'dismiss') => {
    if (!report.reco?.id) return
    setBusy(action)
    setError(null)
    const res = await fetch(`/api/admin/reports/${report.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setError(body.error ?? 'Erreur inconnue')
      return
    }
    router.refresh()
  }

  return (
    <li className="rounded-sm border border-or/20 bg-blanc p-5 md:p-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="rounded-full bg-red-900/10 px-2 py-0.5 text-[10px] tracking-[0.22em] text-red-900 uppercase">
          Signalement
        </span>
        <p className="font-serif text-lg font-light text-vert">{target}</p>
        <span className="text-[11px] text-texte-sec">
          Signalé par {report.reporter?.prenom ?? 'Anonyme'} le{' '}
          {new Date(report.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>

      {report.reason && (
        <div className="mt-3 rounded-sm border border-or/15 bg-creme-soft p-3">
          <p className="overline text-or">Motif</p>
          <p className="mt-1 text-[13px] italic text-texte">
            « {report.reason} »
          </p>
        </div>
      )}

      {report.reco && (
        <div className="mt-4 rounded-sm border border-or/10 bg-creme-soft p-4">
          <p className="overline text-or">Avis signalé</p>
          {report.reco.rating !== null && (
            <div className="mt-2 flex gap-0.5 text-or">
              {Array.from({ length: 5 }).map((_, k) => (
                <span
                  key={k}
                  className={k < (report.reco?.rating ?? 0) ? 'opacity-100' : 'opacity-20'}
                >
                  ★
                </span>
              ))}
            </div>
          )}
          {report.reco.comment && (
            <p className="mt-2 font-serif text-[14px] italic text-texte">
              « {report.reco.comment} »
            </p>
          )}
          <p className="mt-2 text-[11px] text-texte-sec">
            Statut avis actuel :{' '}
            <span className="font-medium text-vert">{report.reco.status}</span>
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-or/10 pt-4">
        {targetLink && (
          <a
            href={targetLink}
            target="_blank"
            rel="noopener"
            className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
          >
            Voir sur la fiche →
          </a>
        )}
        <button
          type="button"
          onClick={() => resolveReport('remove_reco')}
          disabled={busy !== null || report.reco?.status === 'removed'}
          className="inline-flex h-9 items-center rounded-full bg-red-900 px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-red-900/90 disabled:opacity-60"
        >
          {busy === 'remove_reco' ? '…' : 'Retirer l\'avis'}
        </button>
        <button
          type="button"
          onClick={() => resolveReport('dismiss')}
          disabled={busy !== null}
          className="inline-flex h-9 items-center rounded-full border border-or/30 px-4 text-[10px] font-medium tracking-[0.22em] text-texte-sec uppercase hover:border-or hover:text-vert disabled:opacity-60"
        >
          {busy === 'dismiss' ? '…' : 'Classer sans suite'}
        </button>
      </div>

      {error && <p className="mt-2 text-[12px] text-red-900">{error}</p>}
    </li>
  )
}
