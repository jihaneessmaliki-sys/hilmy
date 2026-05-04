'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DevisRowProps {
  devis: {
    id: string
    prenom: string
    email: string
    telephone: string | null
    message: string
    status: string
    email_sent_at: string | null
    email_error: string | null
    created_at: string
    updated_at: string
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  replied: 'Répondu',
  ignored: 'Ignoré',
  archived: 'Archivé',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-or/15 text-or-deep',
  replied: 'bg-vert/15 text-vert',
  ignored: 'bg-texte-sec/15 text-texte-sec',
  archived: 'bg-texte-sec/10 text-texte-sec/80',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DevisRow({ devis }: DevisRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState(devis.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateStatus = async (next: string) => {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('devis_requests')
      .update({ status: next })
      .eq('id', devis.id)
    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setStatus(next)
  }

  return (
    <li className="rounded-sm border border-or/15 bg-blanc transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,61,46,0.15)]">
      <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-lg font-light text-vert">
              {devis.prenom}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-[0.18em] uppercase ${STATUS_COLOR[status] ?? STATUS_COLOR.pending}`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          <p className="truncate text-[12px] text-texte-sec">
            {devis.email}
            {devis.telephone ? ` · ${devis.telephone}` : ''}
          </p>
          <p className="text-[11px] text-texte-sec/80">
            Reçue le {formatDate(devis.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${devis.email}?subject=${encodeURIComponent(`Re: Ta demande de devis sur Hilmy`)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-vert px-4 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:bg-vert-dark"
          >
            Répondre
          </a>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-[11px] tracking-[0.22em] text-or-deep uppercase hover:text-or"
            aria-expanded={expanded}
          >
            {expanded ? 'Masquer' : 'Voir +'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-or/10 px-6 py-5">
          <p className="overline text-or">Son message</p>
          <p className="mt-2 whitespace-pre-wrap font-serif text-[15px] italic leading-[1.65] text-texte">
            « {devis.message} »
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => updateStatus('replied')}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-vert/40 px-4 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-vert hover:bg-vert hover:text-creme disabled:opacity-60"
                >
                  Marquer répondu
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus('ignored')}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-texte-sec/30 px-4 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-all hover:border-texte-sec hover:bg-creme-deep disabled:opacity-60"
                >
                  Ignorer
                </button>
              </>
            )}
            {(status === 'replied' || status === 'ignored') && (
              <button
                type="button"
                onClick={() => updateStatus('archived')}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-texte-sec/30 px-4 text-[11px] font-medium tracking-[0.22em] text-texte-sec uppercase transition-all hover:border-texte-sec hover:bg-creme-deep disabled:opacity-60"
              >
                Archiver
              </button>
            )}

            {devis.email_sent_at ? (
              <span className="ml-auto text-[11px] text-texte-sec">
                ✓ Email envoyé
              </span>
            ) : devis.email_error ? (
              <span
                className="ml-auto text-[11px] text-red-900"
                title={devis.email_error}
              >
                ⚠ Email non envoyé
              </span>
            ) : null}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[11px] text-red-900"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
