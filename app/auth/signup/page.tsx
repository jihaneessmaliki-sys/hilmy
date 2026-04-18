'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import {
  AuthShell,
  AuthField,
} from '@/components/auth/AuthShell'

type Role = 'utilisatrice' | 'prestataire'

// Le backend auth attend "member" | "provider" (voir app/api/auth/signup/route.ts).
// On mappe notre vocabulaire UI → valeurs backend.
function roleToSignupType(role: Role): 'member' | 'provider' {
  return role === 'prestataire' ? 'provider' : 'member'
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ?role=prestataire pré-sélectionne le toggle prestataire
  const initialRole: Role =
    searchParams.get('role') === 'prestataire' ? 'prestataire' : 'utilisatrice'

  const [role, setRole] = useState<Role>(initialRole)
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRole(initialRole)
  }, [initialRole])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mdp.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    if (!email.includes('@')) {
      setError('Ton email a l\'air bancal, check-le.')
      return
    }

    setLoading(true)
    try {
      // On stocke le prénom pour qu'il soit pré-rempli à l'étape /onboarding
      // (le backend /api/auth/signup n'accepte pas prénom pour rester minimal).
      if (prenom.trim()) {
        try {
          sessionStorage.setItem('hilmy_signup_prenom', prenom.trim())
        } catch {
          // Safari private mode etc — non bloquant
        }
      }

      // Stocke le redirect (ex: fiche détail) pour sauter dessus après onboarding.
      const redirectParam = searchParams.get('redirect')
      if (
        redirectParam &&
        redirectParam.startsWith('/') &&
        !redirectParam.startsWith('//')
      ) {
        try {
          sessionStorage.setItem('hilmy_signup_redirect', redirectParam)
        } catch {
          // ignore
        }
      }

      const signupType = roleToSignupType(role)
      const nextPath = role === 'prestataire' ? '/onboarding/prestataire' : '/onboarding'

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: mdp,
          signupType,
          nextPath,
        }),
      })

      const result = (await res.json().catch(() => null)) as {
        error?: string
      } | null

      if (!res.ok) {
        setError(
          result?.error ||
            "Hmm, quelque chose n'a pas marché. Réessaie dans un instant.",
        )
        setLoading(false)
        return
      }

      // Succès → redirect vers la page verify-email (qui connaît l'email pour le resend)
      const target = `/auth/verify-email?email=${encodeURIComponent(
        email.trim().toLowerCase(),
      )}&role=${role}`
      router.push(target)
    } catch {
      setError("Connexion capricieuse. Réessaie dans un moment.")
      setLoading(false)
    }
  }

  // OAuth (Google / Apple) : boutons retirés de l'UI tant que les
  // providers ne sont pas branchés côté Supabase.
  //
  // À rebrancher quand les creds seront configurées :
  //   1. Google Cloud → OAuth 2.0 Client ID (Web) → redirect URI
  //      https://qrlvjwqanixkhopedqqw.supabase.co/auth/v1/callback
  //   2. Apple Developer ($99/an) → Service ID + Sign in with Apple
  //      + clé privée .p8 → même redirect URI Supabase
  //   3. Supabase Dashboard → Authentication → Providers → enable +
  //      coller les creds
  //   4. Restaurer <OAuthButton> + handler `signInWithOAuth({ provider })`
  //      avec redirectTo `${origin}/auth/callback`.

  return (
    <AuthShell
      kicker="Créer mon compte"
      titre={
        <>
          Rejoins la
          <br />
          <em className="italic text-or">communauté.</em>
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        Inscription en 30 secondes. Email, mot de passe, prénom — on te guide
        pour le reste.
      </p>

      {/* Role toggle */}
      <div className="mt-8">
        <p className="overline mb-3 text-or">Je rejoins en tant que</p>
        <div className="relative grid grid-cols-2 rounded-full border border-or/30 bg-blanc p-1">
          <motion.span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-full bg-vert"
            initial={false}
            animate={{
              left: role === 'utilisatrice' ? '0.25rem' : '50%',
              right: role === 'utilisatrice' ? '50%' : '0.25rem',
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
          {(
            [
              { key: 'utilisatrice', label: 'Utilisatrice' },
              { key: 'prestataire', label: 'Prestataire' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setRole(opt.key)}
              className={`relative z-10 h-10 rounded-full text-[11px] font-medium tracking-[0.22em] uppercase transition-colors ${
                role === opt.key ? 'text-creme' : 'text-texte-sec'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {role === 'prestataire' && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-[12px] text-or"
          >
            Après confirmation, on te guide pour créer ta fiche en 2 minutes.
          </motion.p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
        <AuthField
          label="Prénom"
          value={prenom}
          onChange={setPrenom}
          placeholder="Sara"
          autoComplete="given-name"
        />
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
          placeholder="Minimum 8 caractères"
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

        <p className="text-[11px] leading-[1.5] text-texte-sec">
          En rejoignant HILMY, tu confirmes sur l&apos;honneur être une femme et
          acceptes notre{' '}
          <Link href="/charte" className="text-vert underline-offset-4 hover:text-or hover:underline">
            charte
          </Link>
          .
        </p>

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
              <span>Envoi…</span>
            </>
          ) : (
            <>
              {role === 'prestataire' ? 'Créer ma fiche' : 'Rejoindre HILMY'}
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
        Déjà copine ?{' '}
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
