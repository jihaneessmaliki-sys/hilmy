'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { GoldLine } from '@/components/ui/GoldLine'
import { createClient } from '@/lib/supabase/client'
import type { NotificationPrefs } from '@/lib/supabase/types'
import { updateNotificationPrefs } from './actions'

type ToastState = { message: string; type: 'success' | 'error' } | null

export default function ParametresClient({
  initialPrefs,
}: {
  initialPrefs: NotificationPrefs
}) {
  const router = useRouter()
  const [email, setEmail] = useState<string>('')
  const [loadingEmail, setLoadingEmail] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [toggles, setToggles] = useState<NotificationPrefs>(initialPrefs)
  const pendingRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) setEmail(user.email ?? '')
      setLoadingEmail(false)
    }
    run()
  }, [])

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const handleToggle = useCallback(
    async (key: keyof NotificationPrefs) => {
      if (pendingRef.current) return
      const next: NotificationPrefs = { ...toggles, [key]: !toggles[key] }
      setToggles(next)
      pendingRef.current = true
      const result = await updateNotificationPrefs(next)
      pendingRef.current = false
      if (!result.success) {
        setToggles(toggles)
        showToast('Impossible de sauvegarder. Réessaie.', 'error')
      } else {
        showToast('Préférences sauvegardées.', 'success')
      }
    },
    [toggles, showToast],
  )

  const handleSignOut = async () => {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-3 text-[12px] font-medium tracking-wide shadow-md transition-all ${
            toast.type === 'success'
              ? 'bg-vert text-creme'
              : 'bg-or-deep text-blanc'
          }`}
        >
          {toast.message}
        </div>
      )}

      <DashboardHeader
        kicker="Paramètres"
        titre={
          <>
            Tes réglages,
            <br />
            <em className="font-serif italic text-or">à ton rythme.</em>
          </>
        }
        lead="Tu reçois ce que tu as envie de recevoir. Pas plus, pas moins."
      />

      <section className="px-6 py-10 md:px-12 md:py-14">
        <div className="space-y-12">
          <SettingsGroup kicker="Compte" titre="Tes infos de connexion.">
            <div className="flex items-start justify-between gap-6 px-6 py-5">
              <div>
                <p className="text-[14px] font-medium text-vert">Email</p>
                <p className="mt-1 text-[12px] text-texte-sec">
                  {loadingEmail ? '…' : email}
                </p>
              </div>
              <span className="text-[10px] tracking-[0.22em] text-texte-sec uppercase">
                Vérifié
              </span>
            </div>
          </SettingsGroup>

          <SettingsGroup
            kicker="Notifications email"
            titre="Ce qu'on t'envoie."
          >
            <Toggle
              label="La lettre mensuelle"
              hint="Un dimanche par mois, les nouvelles adresses et les moments qui arrivent."
              checked={toggles.emailWeekly}
              onChange={() => handleToggle('emailWeekly')}
            />
            <Toggle
              label="Rappels d'événements"
              hint="La veille de chaque événement auquel tu es inscrite."
              checked={toggles.emailEvenements}
              onChange={() => handleToggle('emailEvenements')}
            />
            <Toggle
              label="Nouvelles prestataires près de chez toi"
              hint="Une alerte quand une nouvelle fiche arrive dans ta ville."
              checked={toggles.emailNouvelles}
              onChange={() => handleToggle('emailNouvelles')}
            />
            <Toggle
              label="Activité sur tes recos"
              hint="Quand une copine commente ou réagit à une adresse que tu as partagée."
              checked={toggles.notifCommentaires}
              onChange={() => handleToggle('notifCommentaires')}
            />
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
              Tu fermes ton carnet ?
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
      </section>
    </>
  )
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

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-6 py-5">
      <div className="max-w-lg">
        <p className="text-[14px] font-medium text-vert">{label}</p>
        {hint && <p className="mt-1 text-[12px] text-texte-sec">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-vert' : 'bg-creme-deep'
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full shadow-sm transition-all ${
            checked ? 'left-6 bg-or' : 'left-1 bg-blanc'
          }`}
        />
      </button>
    </div>
  )
}
