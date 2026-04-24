'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Evenement } from '@/lib/mock-data'

interface Props {
  e: Evenement
  index?: number
  variant?: 'default' | 'hero'
}

function isUrl(v: string | null | undefined): v is string {
  return !!v && (v.startsWith('http://') || v.startsWith('https://'))
}

export function EvenementCard({ e, index = 0, variant = 'default' }: Props) {
  const [jour, mois] = e.date.split(' ')
  const heure = e.date.split('·')[1]?.trim()
  const flyerUrl = isUrl(e.flyer) ? e.flyer : null

  const complet = e.inscrites >= e.places

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={`group overflow-hidden rounded-sm bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)] ${
        variant === 'hero' ? 'md:grid md:grid-cols-2' : 'flex h-full flex-col'
      }`}
    >
      <Link
        href={`/evenement-v2/${e.slug}`}
        className={variant === 'hero' ? 'grid md:grid-cols-2 md:col-span-2' : 'flex h-full flex-col'}
      >
        <div
          className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[3/4]"
          style={{
            background: flyerUrl
              ? undefined
              : `linear-gradient(150deg, ${e.cover} 0%, ${e.cover === '#0F3D2E' ? '#1a4a3a' : '#EEE6D8'} 100%)`,
          }}
        >
          {flyerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flyerUrl}
              alt={e.titre}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-grain opacity-[0.08]" />
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
            {e.categorie}
          </div>
          <div className="absolute bottom-5 left-5 rounded-sm bg-vert/85 px-4 py-3 text-center backdrop-blur">
            <p className="font-serif text-3xl font-light leading-none text-creme">{jour}</p>
            <p className="mt-1 text-[10px] tracking-[0.28em] text-or uppercase">{mois}</p>
          </div>
          {complet && (
            <div className="absolute right-5 top-5 rounded-full bg-texte/85 px-3 py-1 text-[10px] tracking-[0.22em] text-creme uppercase backdrop-blur">
              Complet
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-7 md:p-10">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-or-deep uppercase">
              {e.dateRelative}
            </p>
            <h3 className="mt-2 font-serif text-[26px] font-light leading-tight text-vert md:text-[32px]">
              {e.titre}
            </h3>
            {heure && (
              <p className="mt-2 text-[12px] text-texte-sec">{heure}</p>
            )}
          </div>
          <p className="text-[13px] leading-[1.65] text-texte-sec line-clamp-3">
            {e.description}
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-or/10 pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-or" aria-hidden="true" />
                <span className="text-[11px] font-medium text-texte-sec">{e.lieu} · {e.ville}</span>
              </div>
              <span className="text-[11px] text-texte-sec">
                {e.inscrites} / {e.places} inscrites
              </span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-vert transition-all group-hover:text-or group-hover:gap-2.5"
              aria-hidden="true"
            >
              Voir
              <span className="text-or">→</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
