'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { CATEGORIES_MAP } from '@/lib/constants'

type FicheRow = {
  id: string
  nom: string
  slug: string
  categorie: string
  ville: string
  pays?: string | null
  description: string | null
  tagline: string | null
  whatsapp: string
  email: string | null
  instagram: string | null
  site_web: string | null
  photos: string[]
  galerie: string[]
  services: { nom: string; prix: string; duree: string }[]
  status: string
  source_import: string
  created_at: string
}

export function FicheRow({ fiche }: { fiche: FicheRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [expanded, setExpanded] = useState(false)

  const call = async (action: 'approve' | 'reject') => {
    setBusy(action)
    setError(null)
    const res = await fetch(`/api/admin/fiches/${fiche.id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'reject' ? JSON.stringify({ notes: rejectNotes }) : undefined,
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) {
      setError(body.error ?? 'Erreur inconnue')
      return
    }
    router.refresh()
  }

  const cover = fiche.galerie?.[0] ?? fiche.photos?.[0]
  const metier = CATEGORIES_MAP[fiche.categorie] ?? fiche.categorie

  return (
    <li className="overflow-hidden rounded-sm border border-or/20 bg-blanc">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:p-6">
        <div className="h-24 w-full shrink-0 overflow-hidden rounded-sm bg-creme-deep md:h-20 md:w-20">
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-serif text-xl font-light text-vert">
              {fiche.nom}
            </p>
            <span className="rounded-full bg-or/15 px-2 py-0.5 text-[10px] tracking-[0.22em] text-or-deep uppercase">
              {metier}
            </span>
            <span className="text-[11px] text-texte-sec">
              {fiche.ville}
              {fiche.pays && `, ${fiche.pays}`}
            </span>
          </div>
          {fiche.tagline && (
            <p className="mt-2 font-serif text-[14px] italic text-texte">
              « {fiche.tagline} »
            </p>
          )}
          <p className="mt-2 text-[12px] text-texte-sec">
            WhatsApp : <span className="text-vert">{fiche.whatsapp}</span>
            {fiche.email && ` · ${fiche.email}`}
            {fiche.instagram && ` · @${fiche.instagram}`}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.22em] text-texte-sec/70 uppercase">
            Source :{' '}
            {fiche.source_import === 'google_places'
              ? 'Google Places'
              : fiche.source_import === 'instagram'
                ? 'Instagram'
                : fiche.source_import === 'linkedin'
                  ? 'LinkedIn'
                  : 'Manuelle'}{' '}
            · Reçue le{' '}
            {new Date(fiche.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
          >
            {expanded ? '← Fermer le détail' : 'Voir le détail →'}
          </button>
        </div>

        <div className="flex flex-col gap-2 md:w-44 md:shrink-0">
          <a
            href={`/prestataire-v2/${fiche.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-colors hover:border-or hover:bg-creme-soft"
          >
            Preview
          </a>
          <button
            type="button"
            onClick={() => call('approve')}
            disabled={busy !== null}
            className="inline-flex h-9 items-center justify-center rounded-full bg-vert px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-vert-dark disabled:opacity-60"
          >
            {busy === 'approve' ? '…' : 'Approuver'}
          </button>
          <button
            type="button"
            onClick={() => setShowReject((v) => !v)}
            disabled={busy !== null}
            className="inline-flex h-9 items-center justify-center rounded-full border border-or/30 px-4 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:border-red-900 hover:text-red-900 disabled:opacity-60"
          >
            Refuser
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-or/10 bg-creme-soft"
          >
            <div className="space-y-4 p-5 md:p-6">
              {fiche.description && (
                <div>
                  <p className="overline text-or">Description</p>
                  <p className="mt-2 font-serif text-[14px] italic leading-[1.6] text-texte">
                    {fiche.description}
                  </p>
                </div>
              )}
              {fiche.services?.length > 0 && (
                <div>
                  <p className="overline text-or">Services</p>
                  <ul className="mt-2 divide-y divide-or/10">
                    {fiche.services.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between py-1.5 text-[12px] text-texte"
                      >
                        <span>
                          {s.nom}
                          {s.duree && (
                            <span className="text-texte-sec">
                              {' '}
                              · {s.duree}
                            </span>
                          )}
                        </span>
                        <span className="font-serif italic text-or-deep">
                          {s.prix}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {fiche.galerie?.length > 0 && (
                <div>
                  <p className="overline text-or">Galerie</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-6">
                    {fiche.galerie.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="aspect-square w-full rounded-sm object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReject && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-or/10 bg-creme-soft p-5"
          >
            <p className="overline text-or">Motif du refus</p>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="On écrit quelque chose de respectueux — ce sera envoyé par email à la prestataire."
              className="mt-2 w-full resize-none rounded-sm border border-or/20 bg-blanc px-3 py-2 text-[13px] text-vert focus:border-or focus:outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => call('reject')}
                disabled={busy !== null || !rejectNotes.trim()}
                className="inline-flex h-9 items-center justify-center rounded-full bg-red-900 px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-900/90 disabled:opacity-60"
              >
                {busy === 'reject' ? 'Envoi…' : 'Confirmer le refus'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReject(false)
                  setRejectNotes('')
                }}
                className="text-[11px] tracking-[0.22em] text-texte-sec uppercase hover:text-vert"
              >
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="border-t border-or/10 bg-red-900/5 px-5 py-2 text-[12px] text-red-900">
          {error}
        </p>
      )}
    </li>
  )
}
