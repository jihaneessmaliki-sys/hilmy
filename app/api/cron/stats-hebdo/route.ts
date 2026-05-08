import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendStatsHebdoPrestataire } from '@/lib/email/transactional'
import { isAuthorizedCronRequest } from '@/lib/cron-auth'
import { getEffectivePalier } from '@/lib/permissions'

export const runtime = 'nodejs'
// Pas de cache : appelé par Vercel Cron, doit toujours s'exécuter frais.
export const dynamic = 'force-dynamic'

const PALIER_LABEL: Record<string, string> = {
  premium: 'Premium',
  cercle_pro: 'Cercle Pro',
}

/**
 * Cron Vercel hebdomadaire (lundi 9h UTC, cf vercel.json).
 *
 * Pour chaque prestataire approved et payante (Premium / Cercle Pro,
 * incluant les founders qui bénéficient d'un Cercle Pro effectif) qui n'a
 * PAS opt-out (preferences.notifications.statsHebdoPrestataire !== false),
 * envoie un email résumant les stats de la semaine.
 *
 * Utilise service-role pour bypasser RLS (cron interne, pas de session
 * utilisatrice). Best-effort : un envoi raté n'arrête pas les autres.
 *
 * Sécurité : header Authorization: Bearer ${CRON_SECRET} obligatoire.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const admin = createAdminClient()

  // Fenêtres temporelles
  const now = new Date()
  const since7d = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const since14d = new Date(now.getTime() - 14 * 86_400_000).toISOString()

  // 1. Liste des prestataires éligibles (Premium + Cercle Pro, approved,
  //    incluant les founders qui bénéficient d'un Cercle Pro effectif).
  const { data: prestataires, error: pErr } = await admin
    .from('profiles')
    .select('id, user_id, nom, slug, palier, is_founder')
    .or('palier.in.(premium,cercle_pro),is_founder.eq.true')
    .eq('status', 'approved')

  if (pErr) {
    return NextResponse.json(
      { error: 'fetch_prestataires_failed', detail: pErr.message },
      { status: 500 },
    )
  }

  const list = prestataires ?? []
  let sent = 0
  let skipped = 0
  let failed = 0
  const errors: { profile_id: string; reason: string }[] = []

  for (const p of list) {
    try {
      // Lit l'email + opt-out dans une seule passe.
      const [
        { data: authUser },
        { data: userProfile },
        { count: views7d },
        { count: views7dPrev },
        { count: contacts7d },
        { count: contacts7dPrev },
      ] = await Promise.all([
        admin.auth.admin.getUserById(p.user_id),
        admin
          .from('user_profiles')
          .select('prenom, preferences')
          .eq('user_id', p.user_id)
          .maybeSingle(),
        admin
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', p.id)
          .gte('viewed_at', since7d),
        admin
          .from('profile_views')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', p.id)
          .gte('viewed_at', since14d)
          .lt('viewed_at', since7d),
        admin
          .from('profile_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', p.id)
          .gte('clicked_at', since7d),
        admin
          .from('profile_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', p.id)
          .gte('clicked_at', since14d)
          .lt('clicked_at', since7d),
      ])

      const email = authUser?.user?.email
      if (!email) {
        skipped++
        continue
      }

      // Opt-out : si statsHebdoPrestataire === false, on saute
      const prefs = (userProfile?.preferences ?? {}) as Record<string, unknown>
      const notifs = (prefs.notifications ?? {}) as Record<string, unknown>
      if (notifs.statsHebdoPrestataire === false) {
        skipped++
        continue
      }

      const prenom =
        (userProfile?.prenom as string | undefined) ??
        p.nom.split(' ')[0] ??
        'Toi'

      // Label affiché dans l'email = palier effectif (founders → Cercle Pro)
      const effectivePalier = getEffectivePalier(p)
      await sendStatsHebdoPrestataire({
        to: email,
        prenom,
        nomFiche: p.nom,
        ficheSlug: p.slug,
        views7d: views7d ?? 0,
        views7dPrev: views7dPrev ?? 0,
        contacts7d: contacts7d ?? 0,
        contacts7dPrev: contacts7dPrev ?? 0,
        palierLabel: PALIER_LABEL[effectivePalier] ?? effectivePalier,
      })
      sent++
    } catch (err) {
      failed++
      errors.push({
        profile_id: p.id,
        reason: err instanceof Error ? err.message : String(err),
      })
      // On continue les suivantes (best-effort)
    }
  }

  const durationMs = Date.now() - startedAt

  return NextResponse.json({
    ok: true,
    eligible: list.length,
    sent,
    skipped,
    failed,
    errors: errors.slice(0, 10), // limite log payload
    durationMs,
  })
}
