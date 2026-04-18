'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import {
  AuthShell,
  AuthField,
} from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)

  // Messages depuis le callback /auth/callback?error=link-expired
  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'link-expired') {
      setError(
        "Le lien a expiré ou n'est plus valide. Demande un nouveau lien ou connecte-toi directement.",
      )
      setShowResend(true)
    }
    const justVerified = searchParams.get('verified')
    if (justVerified === '1') {
      setInfo('Email confirmé ✨. Connecte-toi pour entrer.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setShowResend(false)

    if (!email.includes('@')) {
      setError('Email bancal, revérifie-le.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: mdp,
    })

    if (authError) {
      const msg = authError.message?.toLowerCase() ?? ''
      if (
        msg.includes('not confirmed') ||
        msg.includes('not verified') ||
        msg.includes('email_not_confirmed')
      ) {
        setError(
          "Ton email n'est pas encore confirmé. Check ta boîte (et les spams).",
        )
        setShowResend(true)
      } else {
        setError('Email ou mot de passe incorrect.')
      }
      setLoading(false)
      return
    }

    // Connectée → redirect selon signupType (dans user_metadata)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let redirectPath = '/dashboard/utilisatrice'
    if (user) {
      const signupType = (user.user_metadata?.signupType as string) ?? null
      if (signupType === 'provider') {
        redirectPath = '/dashboard/prestataire'
      } else {
        // Si pas de user_profiles encore → onboarding
        const { data: existing } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!existing) {
          redirectPath = '/onboarding'
        }
      }
    }

    // Honore ?redirect=... si path local (whitelist pour éviter open-redirect)
    const redirectParam = searchParams.get('redirect')
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      redirectPath = redirectParam
    }

    router.push(redirectPath)
    router.refresh()
  }

  const handleResend = async () => {
    const target = email.trim().toLowerCase()
    if (!target || !target.includes('@')) {
      setError('Entre ton email ci-dessus pour qu\'on te renvoie le lien.')
      return
    }
    setResending(true)
    setError(null)
    setInfo(null)

    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
      })
      const result = (await res.json().catch(() => null)) as {
        error?: string
      } | null

      if (!res.ok) {
        setError(result?.error ?? "Impossible de renvoyer l'email pour l'instant.")
      } else {
        setInfo("C'est reparti ! Vérifie ta boîte mail (et les spams).")
      }
    } catch {
      setError('Connexion capricieuse. Réessaie dans un moment.')
    }
    setResending(false)
  }

  // OAuth (Google / Apple) : boutons retirés tant que les providers ne
  // sont pas branchés côté Supabase. À rebrancher quand les creds seront
  // configurées (voir commentaire dans signup/page.tsx pour les étapes).

  return (
    <AuthShell
      kicker="Se connecter"
      titre={
        <>
          Bon retour
          <br />
          <em className="italic text-or">parmi les copines.</em>
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        Retrouve tes favoris, tes événements, et les dernières adresses de la
        communauté.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ton@email.com"
          autoComplete="email"
        />
        <AuthField
          label="Mot de passe"
          type="password"
          value={mdp}
          onChange={setMdp}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between text-[12px]">
          <label className="flex items-center gap-2 text-texte-sec">
            <input type="checkbox" className="accent-vert" defaultChecked />
            Se souvenir de moi
          </label>
          <Link
            href="/auth/mot-de-passe-oublie"
            className="text-vert underline-offset-4 hover:text-or hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] leading-[1.55] text-red-900"
          >
            {error}
          </motion.p>
        )}
        {info && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-sm border border-or/30 bg-or/5 px-3 py-2 text-[12px] leading-[1.55] text-or-deep"
          >
            {info}
          </motion.p>
        )}

        {showResend && (
          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep disabled:opacity-60"
          >
            {resending
              ? 'Renvoi en cours…'
              : "Renvoyer l'email de confirmation"}
          </button>
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
              <span>Connexion…</span>
            </>
          ) : (
            <>
              Entrer
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

      <div className="mt-10 border-t border-or/15 pt-6 text-center text-[13px] text-texte-sec">
        Pas encore copine ?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-vert underline-offset-4 hover:text-or hover:underline"
        >
          Rejoins-nous →
        </Link>
      </div>
    </AuthShell>
  )
}
