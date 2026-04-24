'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AuthShell, AuthField } from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'

export default function ReinitialiserMotDePassePage() {
  const router = useRouter()
  const [mdp, setMdp] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mdp.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (mdp !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password: mdp,
    })

    if (updateError) {
      setError(
        "Le lien a peut-être expiré. Redemande-en un depuis la page mot de passe oublié.",
      )
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/auth/login?verified=1'), 1800)
  }

  return (
    <AuthShell
      kicker="Nouveau mot de passe"
      titre={
        <>
          Choisis ton
          <br />
          <em className="italic text-or">nouveau code.</em>
        </>
      }
      citation={
        <>
          Un mot de passe
          <br />
          <em className="italic text-or">que tu retiens</em>
          <br />
          ça change tout.
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        Huit caractères minimum. Prends-en un que tu retiens facilement — le
        reste, on s&apos;en fiche.
      </p>

      {success ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-sm border border-or/30 bg-or/5 p-8 text-center"
        >
          <p className="font-serif text-3xl italic text-or">✓</p>
          <p className="mt-4 font-serif text-2xl font-light text-vert">
            C&apos;est mis à jour ✨
          </p>
          <p className="mt-3 text-[13px] leading-[1.65] text-texte-sec">
            On te redirige vers la connexion dans quelques secondes.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
          <AuthField
            label="Nouveau mot de passe"
            type="password"
            value={mdp}
            onChange={setMdp}
            placeholder="Minimum 8 caractères"
            autoComplete="new-password"
          />
          <AuthField
            label="Confirme"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Retape-le"
            autoComplete="new-password"
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
            className="group mt-2 inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-vert text-[11px] font-medium tracking-[0.28em] text-creme uppercase transition-all hover:bg-vert-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-or-light border-t-transparent"
                />
                <span>Mise à jour…</span>
              </>
            ) : (
              <>
                Mettre à jour
                <span
                  className="text-or-light transition-transform group-hover:translate-x-1"
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
        Retour à la{' '}
        <Link
          href="/auth/login"
          className="font-medium text-vert underline-offset-4 hover:text-or hover:underline"
        >
          connexion
        </Link>
      </div>
    </AuthShell>
  )
}
