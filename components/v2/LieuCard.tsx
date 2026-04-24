'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Lieu } from '@/lib/mock-data'
import { categoriesLieux } from '@/lib/mock-data'

function catLabel(slug: string) {
  return categoriesLieux.find((c) => c.slug === slug)?.label ?? slug
}

// varied heights for editorial masonry feel
const heights = [360, 440, 380, 460, 400, 480]

interface Props {
  lieu: Lieu
  index?: number
}

function isUrl(v: string | undefined): v is string {
  return !!v && (v.startsWith('http://') || v.startsWith('https://'))
}

export function LieuCard({ lieu, index = 0 }: Props) {
  const h = heights[index % heights.length]
  const photoUrl = isUrl(lieu.galerie[0]) ? lieu.galerie[0] : null
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group break-inside-avoid mb-6"
    >
      <Link
        href={`/recommandation/${lieu.slug}`}
        className="block overflow-hidden rounded-sm bg-blanc transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(15,61,46,0.25)]"
      >
        <div
          className="relative overflow-hidden"
          style={{
            height: h,
            background: photoUrl
              ? undefined
              : `linear-gradient(160deg, ${lieu.cover} 0%, ${lieu.galerie[1] ?? lieu.cover} 100%)`,
          }}
        >
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={lieu.nom}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-grain opacity-[0.08]" />
          <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-blanc/85 px-3 py-1 text-[10px] tracking-[0.22em] text-vert backdrop-blur uppercase">
            {catLabel(lieu.categorie)}
          </div>
          {lieu.recommandePar.length > 0 && (
            <div className="absolute bottom-5 left-5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {lieu.recommandePar.slice(0, 3).map((r, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-full ring-2 ring-blanc"
                    style={{ background: r.avatar }}
                  />
                ))}
              </div>
              <span className="rounded-full bg-blanc/85 px-2.5 py-1 text-[10px] font-medium text-vert backdrop-blur">
                {lieu.recommandePar.length} cop{lieu.recommandePar.length > 1 ? 'ines' : 'ine'}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 p-6">
          <h3 className="font-serif text-2xl font-light leading-tight text-vert">
            {lieu.nom}
          </h3>
          <div className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-or" aria-hidden="true" />
            <span className="text-[11px] font-medium text-texte-sec">{lieu.ville}</span>
          </div>
          {lieu.commentaires[0] && (
            <p className="mt-1 font-serif text-[13px] italic leading-[1.55] text-texte-sec line-clamp-3">
              « {lieu.commentaires[0].texte} »
            </p>
          )}
          <span
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-vert transition-all group-hover:text-or group-hover:gap-2.5"
            aria-hidden="true"
          >
            Lire la fiche
            <span className="text-or">→</span>
          </span>
        </div>
      </Link>
    </motion.article>
  )
}
