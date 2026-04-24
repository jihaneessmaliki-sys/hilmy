'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { AvisFormBody } from '@/components/v2/AvisFormBody'

interface Props {
  profileId: string
  profileSlug: string
  profileNom: string
  isAuthenticated: boolean
}

/**
 * CTA "Laisser un avis" sur la fiche prestataire.
 * - Utilisatrice non connectée : redirect vers /auth/signup avec retour.
 * - Utilisatrice connectée : ouvre un modal inline avec le form (AvisFormBody).
 *
 * La route /prestataire-v2/[slug]/avis/nouveau reste active comme fallback
 * pour le flow signup → redirect après création de compte.
 */
export function AvisInlineCTA({
  profileId,
  profileSlug,
  profileNom,
  isAuthenticated,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // ESC ferme modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const handleClick = () => {
    if (!isAuthenticated) {
      const redirectTo = `/prestataire-v2/${profileSlug}/avis/nouveau`
      router.push(`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`)
      return
    }
    setOpen(true)
  }

  const handleSuccess = () => {
    setToast('Ton avis est publié ✨')
    setOpen(false)
    // Refresh server component pour afficher l'avis + MAJ stats
    router.refresh()
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="group inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-vert px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
      >
        Laisser un avis
        <span
          className="text-or-light transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        >
          →
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-vert/40 px-4 py-10 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="avis-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-sm border border-or/20 bg-creme p-6 shadow-2xl md:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="overline text-or">Laisser un avis</p>
                  <h2
                    id="avis-modal-title"
                    className="mt-2 font-serif text-2xl font-light leading-tight text-vert md:text-3xl"
                  >
                    Raconte ton passage chez{' '}
                    <em className="font-serif italic text-or">
                      {profileNom}
                    </em>
                    .
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="shrink-0 rounded-full border border-or/30 px-3 py-1 text-[11px] tracking-[0.18em] text-texte-sec uppercase hover:border-or hover:text-vert"
                  aria-label="Fermer"
                >
                  Fermer
                </button>
              </div>

              <AvisFormBody
                profileId={profileId}
                onSuccess={handleSuccess}
                variant="modal"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-vert px-6 py-3 text-[13px] font-medium text-creme shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
