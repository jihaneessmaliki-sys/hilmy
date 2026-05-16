'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  addFavori,
  isFavori,
  removeFavori,
} from '@/lib/supabase/queries/favoris'
import type { FavoriType } from '@/lib/supabase/types'
import { FavorisPaywallSheet } from '@/components/paywalls/FavorisPaywallSheet'

interface FavoriteButtonProps {
  /** Quel type d'item est sauvegardé (mig 05 + mig 16) :
   *  'prestataire' | 'lieu' | 'evenement' | 'recommendation'.
   *  Pour PR-B1 on utilise les 3 premiers (les recos sont gérées
   *  ailleurs via le système gamification copine). */
  itemType: FavoriType
  /** UUID de l'item sauvegardé (places.id, profiles.id, events.id). */
  itemId: string
  label?: string
  labelActive?: string
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
}

/**
 * Bouton ♡/♥ qui persiste dans la table `favoris` (mig 05) — wired
 * polymorphique pour les 3 itemTypes (prestataire / lieu / evenement).
 *
 * Avant PR-B1 ce composant était un stub local-state qui n'écrivait
 * jamais en BDD → la table `favoris` n'a JAMAIS reçu d'INSERT en prod
 * (vérifié par grep exhaustif). Le wire fix simultanément les saves
 * sur les 3 produits + fait revivre la page /dashboard/utilisatrice/favoris.
 *
 * Source de vérité : lib/supabase/queries/favoris.ts (helpers
 * `addFavori`, `removeFavori`, `isFavori`). RLS owner-only — un user
 * non authentifié verra son clic échouer silencieusement (le bouton
 * est rendu sur des pages déjà gated par redirect /auth/signup).
 */
export function FavoriteButton({
  itemType,
  itemId,
  label = 'Ajouter à mes favoris',
  labelActive = 'Dans tes favoris',
  variant = 'ghost',
  size = 'md',
}: FavoriteButtonProps) {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Lecture initiale de l'état (existe-t-il déjà un favori pour cet item ?).
  // Fail silencieux : si erreur réseau, on assume "pas favori" et on
  // laisse l'utilisatrice toggler manuellement.
  useEffect(() => {
    let cancelled = false
    isFavori(itemType, itemId)
      .then((result) => {
        if (!cancelled) setSaved(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [itemType, itemId])

  const handleToggle = async () => {
    if (loading || pending) return
    setPending(true)

    // Optimistic toggle
    const previous = saved
    const next = !previous
    setSaved(next)

    const op = next
      ? await addFavori(itemType, itemId)
      : await removeFavori(itemType, itemId)

    if (op.error) {
      // Revert l'optimistic toggle puis route l'erreur :
      // - 'FAVORITES_LIMIT_REACHED' → ouvre le paywall Pass Copine
      //   (trigger SQL mig 50 §7 raise exception P0001 avec ce texte
      //   exact pour les non-Copines au 11e favori).
      // - Autre erreur → fail silencieux (la user retentera, le toggle
      //   reflète déjà l'état réel).
      setSaved(previous)
      if (next && op.error.includes('FAVORITES_LIMIT_REACHED')) {
        setPaywallOpen(true)
      }
    }
    setPending(false)
  }

  const base =
    size === 'sm'
      ? 'h-10 px-5 text-[11px]'
      : 'h-[52px] px-7 text-[11px]'

  const styles =
    variant === 'primary'
      ? saved
        ? 'bg-vert text-creme'
        : 'bg-or text-vert hover:bg-or-light'
      : saved
        ? 'border border-or bg-or/15 text-or-deep'
        : 'border border-or/40 bg-transparent text-vert hover:border-or hover:bg-creme-deep'

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || pending}
        className={`group inline-flex items-center gap-2.5 rounded-full font-medium tracking-[0.22em] uppercase transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${base} ${styles}`}
        aria-pressed={saved}
        aria-busy={pending || loading}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={saved ? 'on' : 'off'}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-hidden="true"
          >
            {saved ? '♥' : '♡'}
          </motion.span>
        </AnimatePresence>
        <span>{saved ? labelActive : label}</span>
      </button>
      <FavorisPaywallSheet open={paywallOpen} onOpenChange={setPaywallOpen} />
    </>
  )
}
