'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  open: boolean
  titre: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  placeholder?: string
  minLength?: number
  loading?: boolean
  error?: string | null
  onConfirm: (motif: string) => void
  onCancel: () => void
}

/**
 * Modal avec textarea motif OBLIGATOIRE (défaut min 10 chars).
 * Utilisé pour : admin retire une recommandation, admin retire un événement.
 */
export function MotifModal({
  open,
  titre,
  description,
  confirmLabel = 'Confirmer le retrait',
  cancelLabel = 'Annuler',
  placeholder = 'Motif du retrait…',
  minLength = 10,
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: Props) {
  const [motif, setMotif] = useState('')

  // Reset à l'ouverture
  useEffect(() => {
    if (open) setMotif('')
  }, [open])

  // ESC ferme
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  // Bloque le scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const trimmed = motif.trim()
  const canConfirm = trimmed.length >= minLength && !loading

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-vert/40 px-4 backdrop-blur-sm"
          onClick={() => !loading && onCancel()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="motif-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-sm border border-or/20 bg-creme p-8 shadow-2xl"
          >
            <h2
              id="motif-modal-title"
              className="font-serif text-2xl font-light leading-tight text-vert"
            >
              {titre}
            </h2>
            {description && (
              <div className="mt-3 text-[13px] leading-[1.65] text-texte">
                {description}
              </div>
            )}

            <label className="mt-5 block">
              <span className="overline text-or">Motif</span>
              <textarea
                rows={3}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={placeholder}
                maxLength={500}
                className="mt-2 w-full resize-none rounded-sm border border-or/20 bg-blanc px-3 py-2 text-[13px] leading-[1.6] text-vert focus:border-or focus:outline-none"
              />
              <span className="mt-1 block text-right text-[11px] text-texte-sec">
                {trimmed.length} / min {minLength}
              </span>
            </label>

            {error && (
              <p className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-full border border-or/30 px-5 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:border-or hover:text-vert disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => onConfirm(trimmed)}
                disabled={!canConfirm}
                className="inline-flex h-11 items-center justify-center rounded-full bg-red-900 px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-900/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Envoi…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
