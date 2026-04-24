'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface MethodCardProps {
  icon: ReactNode
  numero: string
  titre: string
  accroche: string
  ideal: string
  duree: string
  href: string
  recommande?: boolean
  index: number
}

export function MethodCard({
  icon,
  numero,
  titre,
  accroche,
  ideal,
  duree,
  href,
  recommande,
  index,
}: MethodCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: 0.1 + index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        href={href}
        className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-sm border border-or/20 bg-blanc p-8 transition-all duration-500 hover:-translate-y-1 hover:border-or hover:shadow-xl"
      >
        {recommande && (
          <span className="absolute right-6 top-6 rounded-full bg-or/15 px-3 py-1 text-[10px] tracking-[0.22em] text-or-deep uppercase">
            Recommandé
          </span>
        )}

        <div className="flex items-center justify-between">
          <span className="font-serif text-[32px] font-light leading-none text-or">
            {numero}
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-creme text-vert transition-colors group-hover:bg-vert group-hover:text-or-light">
            {icon}
          </div>
        </div>

        <div>
          <h3 className="font-serif text-[22px] font-light leading-tight text-vert">
            {titre}
          </h3>
          <p className="mt-3 text-[13px] leading-[1.65] text-texte-sec">{accroche}</p>
        </div>

        <div className="mt-auto space-y-4 pt-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-or" aria-hidden="true" />
            <span className="text-[12px] leading-[1.55] text-texte">
              <span className="font-medium text-vert">Idéal si : </span>
              {ideal}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-or/10 pt-4">
            <span className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">
              ≈ {duree}
            </span>
            <span
              className="inline-flex items-center gap-2 text-[12px] font-medium text-vert transition-all group-hover:text-or group-hover:gap-3"
              aria-hidden="true"
            >
              Choisir
              <span className="text-or">→</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
