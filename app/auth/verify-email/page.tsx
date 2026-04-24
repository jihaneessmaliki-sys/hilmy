'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'motion/react'
import { AuthShell } from '@/components/auth/AuthShell'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  )
}

function VerifyEmail() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const role = searchParams.get('role') ?? 'utilisatrice'

  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleResend = async () => {
    if (!email || !email.includes('@')) {
      setError('Aucun email en mémoire — retourne à l\'inscription.')
      return
    }
    setResending(true)
    setError(null)
    setSent(false)

    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const result = (await res.json().catch(() => null)) as {
        error?: string
      } | null

      if (!res.ok) {
        setError(result?.error ?? 'Impossible de renvoyer l\'email pour l\'instant.')
      } else {
        setSent(true)
      }
    } catch {
      setError('Connexion capricieuse. Réessaie dans un moment.')
    }
    setResending(false)
  }

  return (
    <AuthShell
      kicker="Une dernière étape"
      titre={
        <>
          Vérifie
          <br />
          <em className="italic text-or">ton email.</em>
        </>
      }
      citation={
        <>
          Clique sur le lien
          <br />
          <em className="italic text-or">qu&apos;on t&apos;a envoyé</em>
          <br />
          pour rejoindre le cercle.
        </>
      }
    >
      <p className="mt-4 text-[14px] leading-[1.65] text-texte-sec">
        On vient de t&apos;envoyer un lien de confirmation
        {email ? (
          <>
            {' '}à{' '}
            <strong className="font-medium text-vert">{email}</strong>
          </>
        ) : null}
        . Clique dessus pour rejoindre la communauté. Check aussi tes spams —
        parfois le lien s&apos;y planque.
      </p>

      <div className="mt-10 space-y-4">
        <div className="rounded-sm border border-or/20 bg-creme-deep p-5">
          <p className="overline text-or">Ce qui se passe ensuite</p>
          <ol className="mt-4 space-y-3 text-[13px] leading-[1.6] text-texte">
            <li className="flex gap-3">
              <span className="font-serif italic text-or">1.</span>
              <span>Tu cliques sur le lien dans l&apos;email</span>
            </li>
            <li className="flex gap-3">
              <span className="font-serif italic text-or">2.</span>
              <span>
                On te pose 3 questions (prénom, ville…){' '}
                {role === 'prestataire' ? 'puis on te guide pour créer ta fiche' : 'et c\'est parti'}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-serif italic text-or">3.</span>
              <span>
                {role === 'prestataire'
                  ? "Ta fiche passe en validation (24-48h) avant d'être publique"
                  : "Tu accèdes à l'annuaire et aux recommandations"}
              </span>
            </li>
          </ol>
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

        {sent && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-sm border border-or/30 bg-or/5 px-3 py-2 text-[12px] leading-[1.55] text-or-deep"
          >
            C&apos;est renvoyé ! Revérifie ta boîte dans une minute.
          </motion.p>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-or/40 px-5 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-deep disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? 'Renvoi en cours…' : 'Je n\'ai rien reçu, renvoyer'}
        </button>
      </div>

      <div className="mt-10 border-t border-or/15 pt-6 text-center text-[13px] text-texte-sec">
        Tu as déjà confirmé ?{' '}
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
