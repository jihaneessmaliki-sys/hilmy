'use client'

import { motion } from 'framer-motion'
import { useState, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GoldLine } from '@/components/ui/GoldLine'

export type PreviewField = {
  key: string
  label: string
  value: string
  multiline?: boolean
  readonly?: boolean
  source?: string
}

interface PreviewScreenProps {
  sourceLabel: string
  sourceNom: string
  sourceAvatar?: string
  titre: string
  fields: PreviewField[]
  photos?: string[]
  extras?: ReactNode
  nextLabel?: string
  onPublish?: () => void
}

export function PreviewScreen({
  sourceLabel,
  sourceNom,
  sourceAvatar,
  titre,
  fields,
  photos = [],
  extras,
  nextLabel = 'Publier ma fiche',
  onPublish,
}: PreviewScreenProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.value])),
  )
  const [published, setPublished] = useState(false)

  const handlePublish = () => {
    if (onPublish) onPublish()
    setPublished(true)
    setTimeout(() => router.push('/onboarding/prestataire/publiee'), 600)
  }

  return (
    <div className="relative mx-auto max-w-container px-6 pb-28 md:px-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-20"
      >
        {/* Left: preview card */}
        <div>
          <div className="mb-8 flex items-center gap-4">
            <GoldLine width={48} />
            <span className="overline text-or">Aperçu · telle que verront tes clientes</span>
          </div>

          <div className="overflow-hidden rounded-sm border border-or/15 bg-blanc shadow-[0_40px_120px_-40px_rgba(15,61,46,0.25)]">
            {/* Cover photo or first source photo */}
            <div
              className="relative h-56 w-full md:h-64"
              style={{
                background:
                  photos[0] && photos[0].startsWith('#')
                    ? `linear-gradient(135deg, ${photos[0]} 0%, ${photos[1] || photos[0]} 100%)`
                    : '#EEE6D8',
              }}
            >
              <div className="absolute inset-0 bg-grain opacity-[0.08]" />
              <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full bg-vert/80 px-3 py-1 text-[10px] tracking-[0.22em] text-creme backdrop-blur uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-or" />
                {sourceLabel}
              </div>
            </div>

            <div className="space-y-6 p-8 md:p-10">
              <div>
                <p className="overline text-or">Profil vérifié</p>
                <h2 className="mt-2 font-serif text-3xl font-light text-vert md:text-4xl">
                  {titre}
                </h2>
              </div>

              <div className="divide-y divide-or/10">
                {fields.map((f) => (
                  <FieldRow
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    editing={editing === f.key}
                    onStartEdit={() => setEditing(f.key)}
                    onStopEdit={() => setEditing(null)}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                  />
                ))}
              </div>

              {photos.length > 1 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="overline text-or">Galerie · importée</p>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-texte-sec transition-colors hover:text-or"
                    >
                      Réorganiser
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.slice(0, 6).map((color, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="aspect-square rounded-sm"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {extras}
            </div>
          </div>
        </div>

        {/* Right: sidebar — source + action */}
        <div className="md:sticky md:top-28 md:self-start">
          <div className="flex flex-col gap-6 rounded-sm bg-creme-deep p-8">
            <div>
              <p className="overline text-or">Source</p>
              <div className="mt-3 flex items-center gap-3">
                {sourceAvatar && (
                  <span
                    className="h-10 w-10 rounded-full ring-1 ring-or/40"
                    style={{ background: sourceAvatar }}
                  />
                )}
                <div>
                  <p className="font-serif text-lg text-vert">{sourceNom}</p>
                  <p className="text-[11px] tracking-[0.22em] text-or-deep uppercase">
                    Importation réussie
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-or/15" />

            <p className="text-[13px] leading-[1.7] text-texte-sec">
              Tout est modifiable. Clique sur n&apos;importe quelle info pour la corriger. Tu
              pourras revenir ici à tout moment depuis ton dashboard.
            </p>

            <div className="h-px w-full bg-or/15" />

            <ul className="flex flex-col gap-3 text-[13px]">
              {[
                'Aucun profil public avant validation',
                'Équipe HILMY passe sur ta fiche sous 48h',
                'Tu es notifiée quand c\'est en ligne',
              ].map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-or"
                    aria-hidden="true"
                  />
                  <span className="text-texte">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {published ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm border border-or/30 bg-blanc p-6 text-center"
              >
                <p className="font-serif text-2xl font-light text-vert">
                  C&apos;est envoyé ✓
                </p>
                <p className="mt-2 text-[13px] text-texte-sec">
                  On te prévient dès que ta fiche est en ligne.
                </p>
                <Link
                  href="/dashboard/prestataire"
                  className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-or"
                >
                  Aller à mon dashboard →
                </Link>
              </motion.div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="group inline-flex h-[58px] items-center justify-center gap-2.5 rounded-full bg-vert px-8 text-[13px] font-medium tracking-[0.2em] text-creme uppercase transition-all duration-300 hover:bg-vert-dark"
                >
                  {nextLabel}
                  <span
                    className="text-or-light transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
                <Link
                  href="/onboarding/prestataire"
                  className="text-center text-[12px] text-texte-sec transition-colors hover:text-or"
                >
                  Recommencer avec une autre méthode
                </Link>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function FieldRow({
  field,
  value,
  editing,
  onStartEdit,
  onStopEdit,
  onChange,
}: {
  field: PreviewField
  value: string
  editing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  onChange: (v: string) => void
}) {
  if (field.readonly) {
    return (
      <div className="py-4">
        <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">{field.label}</p>
        <p className="mt-1 text-[14px] text-vert">{value}</p>
      </div>
    )
  }

  return (
    <div className="group/row py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.22em] text-texte-sec uppercase">{field.label}</p>
        {!editing && (
          <button
            type="button"
            onClick={onStartEdit}
            className="text-[11px] font-medium text-texte-sec opacity-0 transition-opacity hover:text-or group-hover/row:opacity-100"
          >
            Modifier
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2">
          {field.multiline ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onStopEdit}
              rows={3}
              className="w-full resize-none rounded-sm border border-or/30 bg-blanc px-3 py-2 text-[14px] text-vert focus:border-or focus:outline-none"
            />
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onStopEdit}
              onKeyDown={(e) => e.key === 'Enter' && onStopEdit()}
              className="w-full rounded-sm border border-or/30 bg-blanc px-3 py-2 text-[14px] text-vert focus:border-or focus:outline-none"
            />
          )}
          <p className="mt-1 text-[11px] text-texte-sec">Appuie sur Entrée pour valider</p>
        </div>
      ) : (
        <p
          className={`mt-1 cursor-text text-[14px] text-vert ${
            field.multiline ? 'leading-[1.6]' : ''
          }`}
          onClick={onStartEdit}
        >
          {value}
        </p>
      )}
    </div>
  )
}
