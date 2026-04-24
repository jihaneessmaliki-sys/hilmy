'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface StatCardProps {
  kicker: string
  value: ReactNode
  hint?: ReactNode
  variant?: 'cream' | 'vert' | 'or'
  index?: number
}

export function StatCard({
  kicker,
  value,
  hint,
  variant = 'cream',
  index = 0,
}: StatCardProps) {
  const variants = {
    cream: 'bg-blanc border border-or/15 text-vert',
    vert: 'bg-vert text-creme',
    or: 'bg-or text-vert',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, boxShadow: '0 30px 60px -30px rgba(15,61,46,0.25)' }}
      className={`group relative flex h-full flex-col justify-between rounded-sm p-7 transition-all duration-500 md:p-8 ${variants[variant]}`}
    >
      <span
        className={`overline ${variant === 'cream' ? 'text-or' : 'text-or-light'}`}
      >
        {kicker}
      </span>
      <div className="mt-6 flex items-baseline gap-3">
        <p className="font-serif text-5xl font-light leading-none md:text-[56px]">
          {value}
        </p>
      </div>
      {hint && (
        <p
          className={`mt-4 text-[12px] leading-[1.5] ${
            variant === 'cream' ? 'text-texte-sec' : 'text-creme/70'
          }`}
        >
          {hint}
        </p>
      )}
    </motion.div>
  )
}
