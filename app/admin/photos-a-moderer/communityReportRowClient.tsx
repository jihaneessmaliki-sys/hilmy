'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MotifModal } from '@/components/v2/MotifModal'

/**
 * Ligne de la file « Signalées par la communauté » (PR-c).
 *
 * Source : content_reports (target_type='place_photo', status='pending'). Un
 * signalement ne masque RIEN — la photo reste publiée tant que l'admin n'agit
 * pas. Deux issues pour vider la file :
 *  - « Retirer la photo » → /api/admin/place-photos/[photo_id]/remove (soft
 *    delete + motif), PUIS marque le signalement reviewed (sort de la file).
 *  - « Marquer traité » → /api/admin/content-reports/[report_id]/status
 *    (reviewed) sans toucher la photo (signalement jugé infondé / déjà géré).
 */
type CommunityReport = {
  report_id: string
  photo_id: string
  reason: string | null
  reported_at: string
  url: string | null
  photo_status: string | null
  prenom: string
  place: { name: string; slug: string | null } | null
}

export function CommunityReportRow({ report }: { report: CommunityReport }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const placeName = report.place?.name ?? 'Lieu inconnu'
  const placeLink = report.place?.slug ? `/recommandation/${report.place.slug}` : null

  const markReviewed = async () => {
    setBusy('reviewed')
    setError(null)
    const res = await fetch(`/api/admin/content-reports/${report.report_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setError(body.error ?? 'Erreur inconnue')
      return
    }
    router.refresh()
  }

  const confirmRemove = async (motif: string) => {
    setBusy('removed')
    setRemoveError(null)
    // 1. Retrait de la photo (soft delete + motif).
    const res = await fetch(`/api/admin/place-photos/${report.photo_id}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setBusy(null)
      setRemoveError(body.error ?? 'Erreur inconnue')
      return
    }
    // 2. Le signalement sort de la file (reviewed). Échec ici = non bloquant :
    //    la photo est déjà retirée, l'admin pourra re-traiter le signalement.
    await fetch(`/api/admin/content-reports/${report.report_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'reviewed' }),
    })
    setBusy(null)
    setRemoveOpen(false)
    router.refresh()
  }

  return (
    <li className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
      {report.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.url}
          alt={`Photo signalée de ${placeName}`}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-creme-deep">
          <p className="text-[12px] italic text-texte-sec">Photo introuvable</p>
        </div>
      )}
      <div className="p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-serif text-lg font-light text-vert">{placeName}</p>
          <span className="text-[11px] text-texte-sec">
            par {report.prenom} · signalée le{' '}
            {new Date(report.reported_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        <div className="mt-3 rounded-sm border border-or/20 bg-creme-soft p-3">
          <p className="overline text-or">Motif du signalement</p>
          <p className="mt-1 text-[12px] italic text-texte">
            {report.reason ? `« ${report.reason} »` : 'Aucun motif précisé.'}
          </p>
        </div>

        {report.photo_status && report.photo_status !== 'published' && (
          <p className="mt-2 text-[11px] tracking-[0.18em] text-texte-sec uppercase">
            Photo déjà {report.photo_status}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-or/10 pt-4">
          {placeLink && (
            <a
              href={placeLink}
              target="_blank"
              rel="noopener"
              className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
            >
              Voir la fiche →
            </a>
          )}
          <button
            type="button"
            onClick={markReviewed}
            disabled={busy !== null}
            className="inline-flex h-8 items-center rounded-full border border-or/30 px-4 text-[10px] font-medium tracking-[0.22em] text-texte-sec uppercase hover:border-or hover:text-or-deep disabled:opacity-60"
          >
            {busy === 'reviewed' ? '…' : 'Marquer traité'}
          </button>
          {report.photo_status === 'published' && (
            <button
              type="button"
              onClick={() => {
                setRemoveError(null)
                setRemoveOpen(true)
              }}
              disabled={busy !== null}
              className="inline-flex h-8 items-center rounded-full bg-red-900 px-4 text-[10px] font-medium tracking-[0.22em] text-creme uppercase hover:bg-red-900/90 disabled:opacity-60"
            >
              Retirer la photo
            </button>
          )}
        </div>

        {error && <p className="mt-2 text-[12px] text-red-900">{error}</p>}
      </div>

      <MotifModal
        open={removeOpen}
        titre="Retirer cette photo ?"
        description={
          <>
            <p>
              Soft delete : la photo disparaîtra des fiches (PR-c) et ne sera plus comptée.{' '}
              <strong className="text-vert">
                Le motif est obligatoire (10 caractères min.)
              </strong>
              . Le signalement sera marqué traité.
            </p>
            <p className="mt-2 italic text-texte-sec">
              Le motif est visible dans l&apos;admin mais n&apos;est pas envoyé à l&apos;autrice.
            </p>
          </>
        }
        confirmLabel="Retirer la photo"
        placeholder="Visage de tiers, contenu inapproprié, doublon..."
        loading={busy === 'removed'}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveOpen(false)}
      />
    </li>
  )
}
