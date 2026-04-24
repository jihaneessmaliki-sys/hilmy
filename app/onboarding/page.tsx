'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AuthShell, AuthField } from '@/components/auth/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { villesSuggestions } from '@/lib/mock-data'
import { formatVilleDisplay } from '@/lib/geo/city-centroids'

const PAYS = ['Suisse', 'France', 'Belgique', 'Luxembourg', 'Monaco']

export default function OnboardingPage() {
  const router = useRouter()

  const [prenom, setPrenom] = useState('')
  const [pays, setPays] = useState('')
  const [ville, setVille] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pré-fill prénom depuis la session signup (stocké dans /auth/signup).
  // Check existance profile : si déjà rempli, redirect vers dashboard.
  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const stored =
          typeof window !== 'undefined'
            ? sessionStorage.getItem('hilmy_signup_prenom')
            : null
        if (stored && !prenom) setPrenom(stored)
      } catch {
        // ignore
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Check si user_profiles déjà rempli via RPC (bypass schema cache)
      const { data: existing } = await supabase.rpc('get_user_profile', {
        p_user_id: user.id,
      })

      if (!cancelled) {
        if (existing && existing.length > 0) {
          const signupType =
            (user.user_metadata?.signupType as string) ?? 'member'
          const target =
            signupType === 'provider'
              ? '/dashboard/prestataire'
              : '/dashboard/utilisatrice'
          router.replace(target)
          return
        }
        setChecking(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [router, prenom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!prenom.trim()) {
      setError('Ton prénom, c\'est le minimum.')
      return
    }
    if (!pays) {
      setError('Dis-nous dans quel pays tu es.')
      return
    }
    if (!ville.trim()) {
      setError('Et dans quelle ville ?')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expirée. Re-connecte-toi.')
      setLoading(false)
      return
    }

    const signupType =
      (user.user_metadata?.signupType as string) ?? 'member'

    const { error: rpcError } = await supabase.rpc('create_user_profile', {
      p_user_id: user.id,
      p_prenom: prenom.trim(),
      p_pays: pays,
      p_ville: formatVilleDisplay(ville.trim()) ?? ville.trim(),
      p_signup_type: signupType,
    })

    if (rpcError) {
      setError(
        `Petit pépin : ${rpcError.message}. Réessaie dans un instant.`,
      )
      setLoading(false)
      return
    }

    // Bio optionnelle : update direct si renseignée (l'RPC n'accepte pas bio)
    if (bio.trim()) {
      await supabase
        .from('user_profiles')
        .update({ bio: bio.trim() })
        .eq('user_id', user.id)
    }

    // Redirect déposé par /auth/signup?redirect=... → prioritaire pour
    // utilisatrice. Les prestataires continuent vers /onboarding/prestataire
    // (on ne court-circuite pas leur setup fiche).
    let pendingRedirect: string | null = null
    try {
      sessionStorage.removeItem('hilmy_signup_prenom')
      const r = sessionStorage.getItem('hilmy_signup_redirect')
      if (r && r.startsWith('/') && !r.startsWith('//')) pendingRedirect = r
    } catch {
      // ignore
    }

    // Redirection selon le rôle
    let target: string
    if (signupType === 'provider') {
      target = '/onboarding/prestataire'
    } else {
      target = pendingRedirect ?? '/dashboard/utilisatrice'
      if (pendingRedirect) {
        try {
          sessionStorage.removeItem('hilmy_signup_redirect')
        } catch {
          // ignore
        }
      }
    }
    router.push(target)
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-creme">
        <div className="flex items-center gap-3 text-[11px] tracking-[0.22em] text-or uppercase">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-or border-t-transparent"
          />
          Préparation…
        </div>
      </div>
    )
  }

  return (
    <AuthShell
      kicker="Dis-nous qui tu es"
      titre={
        <>
          Trois questions
          <br />
          <em className="italic text-or">et c&apos;est tout.</em>
        </>
      }
      citation={
        <>
          On personnalise
          <br />
          <em className="italic text-or">ton carnet</em>
          <br />
          en 30 secondes.
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        Ton prénom, ta ville, et si tu veux une phrase sur toi. On en
        fait rien d&apos;autre que t&apos;accueillir proprement.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
        <AuthField
          label="Prénom"
          value={prenom}
          onChange={setPrenom}
          placeholder="Sara"
          autoComplete="given-name"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="overline text-or">Pays</span>
            <select
              value={pays}
              onChange={(e) => setPays(e.target.value)}
              className="border-b border-or/20 bg-transparent py-2 text-[15px] text-vert focus:border-or focus:outline-none"
            >
              <option value="">Choisir…</option>
              {PAYS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="overline text-or">Ville</span>
            <input
              type="text"
              list="onboarding-villes"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              placeholder="Genève, Lyon…"
              className="border-b border-or/20 bg-transparent py-2 text-[15px] text-vert placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
              autoComplete="off"
            />
            <datalist id="onboarding-villes">
              {villesSuggestions.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="overline text-or">Une phrase sur toi (optionnel)</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Architecte, 34 ans, je cherche les adresses qui ne s'affichent pas sur Google."
            className="resize-none border-b border-or/20 bg-transparent py-2 font-serif text-[15px] italic leading-[1.55] text-vert placeholder:not-italic placeholder:font-sans placeholder:text-texte-sec/50 focus:border-or focus:outline-none"
          />
        </label>

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
              <span>En cours…</span>
            </>
          ) : (
            <>
              Découvrir le carnet
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

      <div className="mt-10 border-t border-or/15 pt-6 text-center text-[11px] text-texte-sec">
        Ces infos restent privées — seul ton prénom apparaît publiquement.{' '}
        <Link
          href="/confidentialite"
          className="underline-offset-4 hover:text-or hover:underline"
        >
          En savoir +
        </Link>
      </div>
    </AuthShell>
  )
}
