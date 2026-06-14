'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { RecoForm, type ExistingReco } from '@/components/v2/RecoForm'
import { createClient } from '@/lib/supabase/client'

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
  // Suppression (droit à l'effacement RGPD) — confirmation BLOQUANTE.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const isEdit = existingReco !== null

  const close = () => {
    setOpen(false)
    setError(null)
  }

  /**
   * Suppression définitive de SA reco. Ordre IMPÉRATIF storage-d'abord :
   * 1. on collecte tous les chemins storage (table place_user_photos + URLs
   *    legacy photo_urls), dédupliqués ;
   * 2. on supprime les FICHIERS d'abord — si ça échoue, on n'efface RIEN en
   *    base (zéro fichier orphelin) ;
   * 3. on supprime les lignes place_user_photos AVANT la reco (la FK est
   *    ON DELETE SET NULL : supprimer la reco d'abord casserait le lien) ;
   * 4. on supprime la reco (DELETE protégé Postgres-side par la RLS owner-only
   *    `auth.uid() = user_id` — l'UI ne fait que déclencher).
   * 5. router.refresh() → la reco disparaît, « N copines » + note recalculés.
   */
  const handleDelete = async () => {
    if (!existingReco) return
    setDeleting(true)
    setDeleteError(null)
    const supabase = createClient()

    // 1. Collecte des chemins storage (table + legacy), dédupliqués.
    const paths = new Set<string>()
    const { data: rows } = await supabase
      .from('place_user_photos')
      .select('storage_path')
      .eq('recommendation_id', existingReco.id)
    for (const r of (rows ?? []) as Array<{ storage_path: string | null }>) {
      if (r.storage_path) paths.add(r.storage_path)
    }
    const marker = '/recommendation-photos/'
    for (const url of existingReco.photo_urls ?? []) {
      const idx = url.indexOf(marker)
      if (idx !== -1) paths.add(decodeURIComponent(url.slice(idx + marker.length)))
    }

    // 2. STORAGE D'ABORD — abort total si échec (zéro orphelin).
    if (paths.size > 0) {
      const { error: rmErr } = await supabase.storage
        .from('recommendation-photos')
        .remove(Array.from(paths))
      if (rmErr) {
        setDeleting(false)
        setDeleteError(
          "Impossible de supprimer les photos — rien n'a été supprimé, réessaie.",
        )
        return
      }
    }

    // 3. Lignes place_user_photos (RLS owner-only) AVANT la reco.
    await supabase.from('place_user_photos').delete().eq('recommendation_id', existingReco.id)

    // 4. La reco (RLS DELETE owner-only Postgres-side).
    const { error: recoErr } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', existingReco.id)
    if (recoErr) {
      setDeleting(false)
      setDeleteError('Suppression impossible. Réessaie.')
      return
    }

    // 5. Fermeture + re-render server.
    setDeleting(false)
    setConfirmOpen(false)
    router.refresh()
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

      {isEdit && (
        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setConfirmOpen(true)
          }}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-red-900/30 text-[11px] font-medium tracking-[0.22em] text-red-900 uppercase transition-all hover:border-red-900 hover:bg-red-900/5"
        >
          Supprimer ma reco
        </button>
      )}

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

      {/* Confirmation BLOQUANTE : impossible de supprimer en un clic. Annuler
          est le bouton par défaut (autoFocus) — un Entrée annule, ne supprime
          pas. La suppression exige un clic explicite sur le bouton danger. */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-vert/50 px-4 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-reco-title"
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
                id="delete-reco-title"
                className="font-serif text-2xl font-light leading-tight text-vert"
              >
                Es-tu sûre ?
              </h2>
              <p className="mt-3 text-[14px] leading-[1.65] text-texte">
                Cette action est <strong className="text-red-900">définitive</strong>. Ta reco et
                ses photos seront supprimées — y compris les fichiers. Impossible de revenir en
                arrière.
              </p>

              {deleteError && (
                <p className="mt-4 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setConfirmOpen(false)}
                  disabled={deleting}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-or/30 px-5 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-colors hover:border-or hover:text-vert disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-red-900 px-5 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-colors hover:bg-red-900/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deleting ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
