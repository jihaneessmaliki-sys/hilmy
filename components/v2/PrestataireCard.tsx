'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Prestataire } from '@/lib/mock-data'
import { categoriesPrestataires } from '@/lib/mock-data'
import { PalierBadge } from './PalierBadge'

function categorieLabel(slug: string) {
  return (
    categoriesPrestataires.find((c) => c.slug === slug)?.label ?? slug
  )
}

interface Props {
  p: Prestataire
  index?: number
}

function isUrl(v: string | undefined): v is string {
  return !!v && (v.startsWith('http://') || v.startsWith('https://'))
}

export function PrestataireCard({ p, index = 0 }: Props) {
  const photoUrl = isUrl(p.galerie[0]) ? p.galerie[0] : null
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group flex h-full flex-col overflow-hidden rounded-sm bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
    >
      <Link href={`/prestataire-v2/${p.slug}`} className="flex h-full flex-col">
        <div
          className="relative h-64 w-full overflow-hidden"
          style={{
            background: photoUrl
              ? undefined
              : `linear-gradient(135deg, ${p.cover} 0%, ${p.galerie[0] ?? p.cover} 100%)`,
          }}
        >
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={p.nom}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-grain opacity-[0.08]" />
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
            {categorieLabel(p.categorie)}
          </div>
          {p.lesAvis && p.lesAvis.length > 0 && (
            <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-vert/85 px-3 py-1 text-[11px] text-creme backdrop-blur">
              <span className="text-or">★</span>
              {p.note.toFixed(1)}
            </div>
          )}
          {/* Badge palier — visible seulement pour premium/cercle_pro
              (le standard est le défaut, on ne badge pas pour ne pas
              surcharger la liste). */}
          {(p.palier === 'premium' || p.palier === 'cercle_pro') && (
            <div className="absolute bottom-5 right-5">
              <PalierBadge palier={p.palier} size="small" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-7">
          <div>
            <p className="text-[11px] tracking-[0.22em] text-or-deep uppercase">{p.metier}</p>
            <h3 className="mt-2 font-serif text-[26px] font-light leading-tight text-vert">
              {p.nom}
            </h3>
          </div>
          <p className="font-serif text-[15px] italic leading-[1.5] text-texte-sec">
            « {p.tagline} »
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-or/10 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-or" aria-hidden="true" />
              <span className="text-[11px] font-medium text-texte-sec">{p.ville}</span>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-vert transition-all group-hover:text-or group-hover:gap-2.5"
              aria-hidden="true"
            >
              Dès {p.tarifsDe} {p.ville === 'Paris' || p.ville === 'Lyon' || p.ville === 'Bruxelles' || p.ville === 'Luxembourg' ? '€' : 'CHF'}
              <span className="text-or">→</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
