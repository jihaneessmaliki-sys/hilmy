'use client'

import { useState } from 'react'
import { FadeInSection } from '@/components/ui/FadeInSection'
import { GoldLine } from '@/components/ui/GoldLine'

/**
 * ⚠️ IMPORTANT — Ne pas toucher à l'auth existante de Hilmy.
 *
 * Ce composant envoie simplement l'email vers l'endpoint d'inscription existant.
 * Par défaut il POST vers /api/subscribe — adapte la constante SUBSCRIBE_ENDPOINT ci-dessous
 * pour qu'elle pointe vers ta vraie route (ou remplace par une Server Action).
 *
 * Le système d'email actuel de Hilmy fonctionne déjà, on ne refait PAS de magic link Supabase.
 */

// ⚠️ À adapter : remplace par l'endpoint qui gère l'inscription sur ton projet
const SUBSCRIBE_ENDPOINT = '/api/subscribe'

export function FinalCTA() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const response = await fetch(SUBSCRIBE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Une erreur est survenue')
      }

      setStatus('sent')
      setEmail('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue')
    }
  }

  return (
    <section className="bg-creme py-28 md:py-36">
      <FadeInSection>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
          <GoldLine width={40} />
          <p className="overline text-or">ON T'ATTEND</p>
          <h2 className="font-serif font-light text-h1 text-vert md:text-[56px]">
            Rejoins les copines.
            <br />
            Remplissons ce carnet ensemble.
          </h2>
          <p className="text-sm text-texte-sec">
            Laisse ton email, on te tient au courant.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 w-full max-w-xl"
            aria-label="Inscription par email"
          >
            {status === 'sent' ? (
              <div className="rounded-full border border-or/30 bg-blanc px-8 py-5 text-center text-sm text-vert">
                ✓ Merci ! On t'a envoyé un email, regarde ta boîte.
              </div>
            ) : (
              <>
                <div className="flex h-16 items-center rounded-full border border-or/30 bg-blanc pl-7 pr-2">
                  <label htmlFor="email" className="sr-only">
                    Ton email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="flex-1 bg-transparent text-[15px] text-texte placeholder:text-texte-sec outline-none"
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading' || !email}
                    className="flex h-12 items-center gap-2.5 rounded-full bg-vert px-6 text-[13px] font-semibold text-creme transition-all hover:bg-vert-dark disabled:opacity-60"
                  >
                    {status === 'loading' ? 'Envoi…' : "Je m'inscris"}
                    <span className="text-or-light" aria-hidden="true">→</span>
                  </button>
                </div>
                {status === 'error' && (
                  <p className="mt-3 text-xs text-red-600" role="alert">
                    {errorMsg || 'Oups, réessaie dans un instant.'}
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </FadeInSection>
    </section>
  )
}
