'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'

export default function ParametresPrestatairePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [status, setStatus] = useState<
    'pending' | 'approved' | 'rejected' | 'ghost' | 'paused'
  >('pending')

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expirée.')
        setLoading(false)
        return
      }
      setEmail(user.email ?? '')
      const { data } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setProfileId(data.id)
        setStatus(data.status)
      }
      setLoading(false)
    }
    run()
  }, [])

  const toggleVisibility = async () => {
    if (!profileId) return
    const next = status === 'approved' ? 'paused' : 'approved'
    setSaving(true)
    setError(null)
    setMsg(null)
    const supabase = createClient()
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ status: next })
      .eq('id', profileId)
    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setStatus(next)
    setMsg(
      next === 'approved'
        ? 'Ta fiche est de nouveau visible.'
        : 'Ta fiche est en pause — elle n\'apparaît plus dans l\'annuaire.',
    )
    setTimeout(() => setMsg(null), 4000)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const canToggle = status === 'approved' || status === 'paused'

  return (
    <>
      <DashboardHeader
        kicker="Paramètres"
        titre={
          <>
            Tes réglages,{' '}
            <em className="font-serif italic text-or">à ton image.</em>
          </>
        }
        lead="Compte, visibilité, déconnexion."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        {error && (
          <p className="mb-6 rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2 text-[12px] text-red-900">
            {error}
          </p>
        )}
        {msg && (
          <p className="mb-6 rounded-sm border border-or/30 bg-or/10 px-3 py-2 text-[12px] text-vert">
            {msg}
          </p>
        )}

        {loading ? (
          <div className="h-96 animate-pulse rounded-sm bg-creme-deep" />
        ) : (
          <div className="space-y-12">
            <SettingsGroup kicker="Compte" titre="Tes infos de connexion.">
              <div className="flex items-start justify-between gap-6 px-6 py-5">
                <div>
                  <p className="text-[14px] font-medium text-vert">Email</p>
                  <p className="mt-1 break-all text-[12px] text-texte-sec">
                    {email}
                  </p>
                </div>
                <Link
                  href="/dashboard/prestataire/fiche"
                  className="text-[11px] tracking-[0.22em] text-or uppercase hover:text-or-deep"
                >
                  Modifier ma fiche →
                </Link>
              </div>
            </SettingsGroup>

            <SettingsGroup
              kicker="Visibilité"
              titre="Ce qu'on voit de toi."
            >
              <div className="flex items-start justify-between gap-6 px-6 py-5">
                <div className="max-w-lg">
                  <p className="text-[14px] font-medium text-vert">
                    Fiche publique active
                  </p>
                  <p className="mt-1 text-[12px] text-texte-sec">
                    Désactive si tu prends une pause. Tes clientes actuelles
                    peuvent toujours te joindre directement.
                  </p>
                  <p className="mt-2 text-[11px] tracking-[0.22em] text-or uppercase">
                    Statut actuel : {labelFor(status)}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={status === 'approved'}
                  disabled={!canToggle || saving}
                  onClick={toggleVisibility}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    status === 'approved' ? 'bg-vert' : 'bg-creme-deep'
                  } disabled:opacity-60`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full shadow-sm transition-all ${
                      status === 'approved' ? 'left-6 bg-or' : 'left-1 bg-blanc'
                    }`}
                  />
                </button>
              </div>
              {!canToggle && (
                <div className="px-6 py-4">
                  <p className="text-[12px] italic text-texte-sec">
                    Tu pourras activer/désactiver ta fiche après sa première
                    validation.
                  </p>
                </div>
              )}
            </SettingsGroup>

            <SettingsGroup
              kicker="Confidentialité"
              titre="Tes données, tes règles."
            >
              <ul className="space-y-3 px-6 py-5 text-[13px] text-texte">
                <li className="flex items-center justify-between border-b border-or/10 pb-3">
                  <span>Exporter toutes mes données</span>
                  <span className="text-[10px] tracking-[0.22em] text-texte-sec uppercase">
                    Bientôt
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Supprimer mon compte définitivement</span>
                  <span className="text-[10px] tracking-[0.22em] text-texte-sec uppercase">
                    Sur demande
                  </span>
                </li>
              </ul>
            </SettingsGroup>

            <div className="rounded-sm bg-vert p-8 text-center text-creme">
              <p className="overline text-or">À bientôt</p>
              <p className="mt-3 font-serif text-2xl font-light">
                Tu fermes ton espace ?
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-creme/40 px-6 text-[11px] font-medium tracking-[0.22em] text-creme uppercase transition-all hover:border-or hover:text-or-light disabled:opacity-60"
              >
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
                <span className="text-or-light" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}

function labelFor(status: string) {
  switch (status) {
    case 'approved':
      return 'Visible dans l\'annuaire'
    case 'pending':
      return 'En revue'
    case 'paused':
      return 'En pause'
    case 'rejected':
      return 'Non validée'
    case 'ghost':
      return 'Archivée'
    default:
      return status
  }
}

function SettingsGroup({
  kicker,
  titre,
  children,
}: {
  kicker: string
  titre: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <GoldLine width={40} />
        <span className="overline text-or">{kicker}</span>
      </div>
      <h2 className="mt-4 font-serif text-2xl font-light text-vert">{titre}</h2>
      <div className="mt-6 divide-y divide-or/15 rounded-sm border border-or/15 bg-blanc">
        {children}
      </div>
    </div>
  )
}
