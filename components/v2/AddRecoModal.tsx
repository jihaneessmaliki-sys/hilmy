'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { RecoForm, type ExistingReco } from '@/components/v2/RecoForm'

/**
 * Client island posé sur la fiche /recommandation/[slug] (rendu CONNECTÉ
 * uniquement — le composant n'existe pas dans le rendu anonyme, donc invisible
 * aux non-membres par construction, pas par condition).
 *
 * Bouton « Ajouter ma reco » → modale réutilisant RecoForm, lieu déjà connu
 * (resolvePlaceId renvoie directement placeId, aucun appel Google).
 * Si `existingReco` est fourni : bouton « Modifier ma reco » + modale préremplie
 * → UPDATE owner-only (verrou RLS user_id = auth.uid()).
 *
 * Au succès : fermeture + router.refresh() pour re-render server → la reco
 * apparaît dans « Ce qu'on en dit » sans rechargement manuel.
 */
export function AddRecoModal({
  userId,
  placeId,
  placeName,
  hilmyCategory,
  existingReco = null,
}: {
  userId: string
  placeId: string
  placeName: string
  hilmyCategory: string
  existingReco?: ExistingReco | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEdit = existingReco !== null

  const close = () => {
    setOpen(false)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-vert text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
      >
        {isEdit ? 'Modifier ma reco' : 'Ajouter ma reco'}
        <span className="text-or-light" aria-hidden="true">
          →
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-vert/40 p-4 backdrop-blur-sm md:p-8"
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={isEdit ? 'Modifier ma recommandation' : 'Ajouter ma recommandation'}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="my-auto w-full max-w-2xl rounded-sm border border-or/20 bg-creme-soft p-6 shadow-xl md:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="overline text-or">
                    {isEdit ? 'Modifier ma reco' : 'Recommander ce lieu'}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-light text-vert">
                    {placeName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fermer"
                  className="shrink-0 rounded-full border border-or/30 px-3 py-1 text-[18px] leading-none text-vert transition-colors hover:border-or hover:bg-blanc"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="mt-5 rounded-sm border border-red-900/20 bg-red-900/5 px-4 py-3 text-[13px] text-red-900">
                  {error}
                </div>
              )}

              <RecoForm
                userId={userId}
                hilmyCategory={hilmyCategory}
                placeReady
                resolvePlaceId={async () => placeId}
                existingReco={existingReco}
                onError={setError}
                onSuccess={() => {
                  close()
                  router.refresh()
                }}
                footer={
                  <button
                    type="button"
                    onClick={close}
                    className="text-[12px] text-texte-sec hover:text-or"
                  >
                    Annuler
                  </button>
                }
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
