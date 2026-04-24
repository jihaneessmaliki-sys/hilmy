'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

export type ConfirmTone = 'danger' | 'warning'

interface Props {
  open: boolean
  titre: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  titre,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  // ESC ferme
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  // Bloque le scroll quand ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const confirmBg =
    tone === 'danger'
      ? 'bg-red-900 text-creme hover:bg-red-900/90'
      : 'bg-or text-vert hover:bg-or-light'

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
          aria-labelledby="confirm-modal-title"
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
              id="confirm-modal-title"
              className="font-serif text-2xl font-light leading-tight text-vert"
            >
              {titre}
            </h2>
            {description && (
              <div className="mt-4 text-[14px] leading-[1.7] text-texte">
                {description}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
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
                onClick={onConfirm}
                disabled={loading}
                className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-[11px] font-medium tracking-[0.22em] uppercase transition-colors disabled:opacity-60 ${confirmBg}`}
              >
                {loading ? 'En cours…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
