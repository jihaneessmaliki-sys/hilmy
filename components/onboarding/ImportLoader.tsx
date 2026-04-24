'use client'

import { motion } from 'framer-motion'

interface ImportLoaderProps {
  steps: string[]
  currentStep: number
  label?: string
}

export function ImportLoader({
  steps,
  currentStep,
  label = 'On récupère tes infos',
}: ImportLoaderProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-10 py-16 text-center">
      {/* Radial pulse */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border border-or/30"
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.span
          className="absolute inset-0 rounded-full border border-or/30"
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
        />
        <motion.div
          className="flex h-24 w-24 items-center justify-center rounded-full bg-vert"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.span
            className="font-serif text-3xl text-or"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
        </motion.div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="overline text-or">{label}</p>
        <p className="font-serif text-2xl font-light text-vert">
          Deux secondes, on fait le tri.
        </p>
      </div>

      <ul className="w-full space-y-3 text-left">
        {steps.map((s, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 text-[13px]"
            >
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: done ? '#C9A961' : active ? '#0F3D2E' : '#E5D4AF40',
                  scale: active ? 1.05 : 1,
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-creme"
              >
                {done ? '✓' : ''}
              </motion.span>
              <span
                className={
                  done
                    ? 'text-texte-sec line-through decoration-or/40'
                    : active
                      ? 'text-vert font-medium'
                      : 'text-texte-sec/60'
                }
              >
                {s}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
