'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FavoriteButtonProps {
  label?: string
  labelActive?: string
  variant?: 'primary' | 'ghost'
  size?: 'md' | 'sm'
}

export function FavoriteButton({
  label = 'Ajouter à mes favoris',
  labelActive = 'Dans tes favoris',
  variant = 'ghost',
  size = 'md',
}: FavoriteButtonProps) {
  const [saved, setSaved] = useState(false)

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
    <button
      type="button"
      onClick={() => setSaved((s) => !s)}
      className={`group inline-flex items-center gap-2.5 rounded-full font-medium tracking-[0.22em] uppercase transition-all duration-300 ${base} ${styles}`}
      aria-pressed={saved}
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
  )
}
