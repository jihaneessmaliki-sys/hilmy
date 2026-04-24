'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { AuthShell, AuthField } from '@/components/auth/AuthShell'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.includes('@')) {
      setError('Email bancal, revérifie-le.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const result = (await res.json().catch(() => null)) as {
        error?: string
      } | null

      if (!res.ok) {
        setError(
          result?.error ?? "Impossible d'envoyer le lien pour l'instant.",
        )
        setLoading(false)
        return
      }
      setSent(true)
      setLoading(false)
    } catch {
      setError('Connexion capricieuse. Réessaie dans un moment.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      kicker="Mot de passe oublié"
      titre={
        <>
          On t&apos;envoie
          <br />
          <em className="italic text-or">un lien.</em>
        </>
      }
      citation={
        <>
          Ça arrive aux meilleures.
          <br />
          <em className="italic text-or">Trois minutes</em>
          <br />
          et tu es de retour.
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        Entre ton email, on t&apos;envoie un lien pour choisir un nouveau mot
        de passe. Le lien reste valide une heure.
      </p>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-sm border border-or/30 bg-or/5 p-8 text-center"
        >
          <p className="font-serif text-3xl italic text-or">✓</p>
          <p className="mt-4 font-serif text-2xl font-light text-vert">
            Check tes emails copine ✨
          </p>
          <p className="mt-3 text-[13px] leading-[1.65] text-texte-sec">
            Si tu as un compte chez nous, le lien vient d&apos;atterrir dans ta
            boîte. Regarde aussi dans tes spams.
          </p>
          <Link
            href="/auth/login"
            className="mt-6 inline-flex items-center gap-2 text-[12px] font-medium text-vert transition-colors hover:text-or"
          >
            Retour à la connexion →
          </Link>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="ton@email.com"
            autoComplete="email"
          />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] leading-[1.55] text-red-900"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-or text-[11px] font-medium tracking-[0.28em] text-vert uppercase transition-all hover:bg-or-light disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-vert border-t-transparent"
                />
                <span>Envoi…</span>
              </>
            ) : (
              <>
                Recevoir un lien
                <span
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  →
                </span>
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-10 border-t border-or/15 pt-6 text-center text-[13px] text-texte-sec">
        Tu t&apos;en souviens finalement ?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-vert underline-offset-4 hover:text-or hover:underline"
        >
          Connecte-toi →
        </Link>
      </div>
    </AuthShell>
  )
}
