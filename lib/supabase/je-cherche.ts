/**
 * Helpers Supabase pour le module "Je cherche..." (Phase 6).
 * Server-side uniquement : utilisent createClient (RLS) ou createAdminClient
 * (bypass RLS pour les jointures complexes côté admin/cron).
 *
 * Validation : Zod sur tous les inputs serveur.
 * Source de vérité : supabase/migrations/38_je_cherche.sql
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type {
  Demande,
  DemandeCategory,
  DemandeCountry,
  DemandeFilters,
  DemandeResponse,
  DemandeResponseWithProfile,
  DemandeWithProfile,
  PaginatedDemandes,
  PaginationCursor,
  SignalementReason,
} from '@/lib/types/je-cherche'

const DEMANDE_CATEGORIES = [
  'beaute',
  'bien-etre',
  'sante-mentale',
  'sport-nutrition',
  'enfants-famille',
  'maison',
  'cuisine',
  'evenementiel',
  'mode-style',
  'business-juridique',
  'conseilleres-de-marque',
  'autre',
] as const

const DEMANDE_COUNTRIES = ['CH', 'FR', 'BE', 'LU', 'MC'] as const
const SIGNALEMENT_REASONS = [
  'spam',
  'inapproprie',
  'harcelement',
  'autre',
] as const

const DEFAULT_PAGE_LIMIT = 24
const MAX_PAGE_LIMIT = 100

// ─── Schemas Zod ────────────────────────────────────────────────────

export const createDemandeSchema = z.object({
  title: z.string().trim().min(5, '5 caractères minimum').max(120, '120 caractères maximum'),
  content: z.string().trim().min(10, '10 caractères minimum').max(2000, '2000 caractères maximum'),
  category: z.enum(DEMANDE_CATEGORIES),
  canton: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  country: z.enum(DEMANDE_COUNTRIES).default('CH'),
  urgency: z.enum(['normal', 'urgent']).default('normal'),
})

export const createResponseSchema = z.object({
  demande_id: z.string().uuid(),
  content: z.string().trim().min(5, '5 caractères minimum').max(1500, '1500 caractères maximum'),
  prestataire_id: z.string().uuid().nullable().optional(),
})

export const signalementSchema = z.object({
  reason: z.enum(SIGNALEMENT_REASONS),
  comment: z.string().trim().max(500).nullable().optional(),
})

export type CreateDemandeInput = z.infer<typeof createDemandeSchema>
export type CreateResponseInput = z.infer<typeof createResponseSchema>
export type SignalementInput = z.infer<typeof signalementSchema>

// ─── Erreurs typées ────────────────────────────────────────────────

export type JeChercheResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string }

function fail(error: string, code?: string): { ok: false; error: string; code?: string } {
  return { ok: false, error, code }
}

// ─── READ ──────────────────────────────────────────────────────────

/**
 * Feed paginé des demandes visibles (open + resolved).
 * Cursor-based : { before: ISO, limit }.
 * Filtres optionnels : category, country, canton, urgencyOnly.
 */
export async function getDemandesFeed(
  filters: DemandeFilters = {},
  cursor: PaginationCursor = {},
): Promise<JeChercheResult<PaginatedDemandes>> {
  try {
    const supabase = await createClient()
    const limit = Math.min(cursor.limit ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT)

    let query = supabase
      .from('demandes_feed')
      .select(
        'id, user_id, title, content, category, canton, city, country, urgency, status, flag_count, response_count, created_at, updated_at, prenom, avatar_url',
      )
      .order('created_at', { ascending: false })
      .limit(limit + 1) // +1 pour détecter hasMore

    if (filters.category) query = query.eq('category', filters.category)
    if (filters.country) query = query.eq('country', filters.country)
    if (filters.canton) query = query.eq('canton', filters.canton)
    if (filters.urgencyOnly) query = query.eq('urgency', 'urgent')
    if (cursor.before) query = query.lt('created_at', cursor.before)

    const { data, error } = await query
    if (error) return fail(error.message, error.code)

    const rows = (data ?? []) as DemandeWithProfile[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].created_at : null

    return { ok: true, data: { items, nextCursor, hasMore } }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Détail d'une demande (avec profil auteur). Retourne null si pas trouvée
 * ou non visible publiquement (sauf owner via RLS owner_read_all).
 */
export async function getDemandeById(
  id: string,
): Promise<JeChercheResult<DemandeWithProfile | null>> {
  if (!z.string().uuid().safeParse(id).success) {
    return fail('ID demande invalide', 'invalid_id')
  }
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('demandes_feed')
      .select(
        'id, user_id, title, content, category, canton, city, country, urgency, status, flag_count, response_count, created_at, updated_at, prenom, avatar_url',
      )
      .eq('id', id)
      .maybeSingle()
    if (error) return fail(error.message, error.code)
    return { ok: true, data: (data as DemandeWithProfile | null) ?? null }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Réponses visibles d'une demande, triées par helpful_count DESC, created_at DESC.
 * Enrichies avec profil auteur + snapshot prestataire si lié.
 */
export async function getDemandeResponsesByDemandeId(
  demandeId: string,
): Promise<JeChercheResult<DemandeResponseWithProfile[]>> {
  if (!z.string().uuid().safeParse(demandeId).success) {
    return fail('ID demande invalide', 'invalid_id')
  }
  try {
    const supabase = await createClient()

    // Étape 1 : fetch responses + auteur via JOIN user_profiles + presta minimal
    const { data, error } = await supabase
      .from('demande_responses')
      .select(
        `
        id, demande_id, user_id, content, prestataire_id,
        flag_count, is_hidden, helpful_count, created_at, updated_at,
        author:user_profiles!demande_responses_user_id_fkey ( prenom, avatar_url ),
        prestataire:profiles!demande_responses_prestataire_id_fkey (
          id, slug, nom, ville, note_moyenne, nb_avis, photos, galerie
        )
        `,
      )
      .eq('demande_id', demandeId)
      .eq('is_hidden', false)
      .order('helpful_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      // Le JOIN explicite via FK name peut échouer si le nom de contrainte
      // diffère. Fallback : requête sans JOIN, on enrichit en 2 passes.
      return getResponsesFallback(demandeId)
    }

    const rows = (data ?? []) as Array<
      DemandeResponse & {
        author: { prenom: string | null; avatar_url: string | null } | null
        prestataire: {
          id: string
          slug: string
          nom: string
          ville: string
          note_moyenne: number
          nb_avis: number
          photos: string[] | null
          galerie: string[] | null
        } | null
      }
    >

    const items: DemandeResponseWithProfile[] = rows.map((r) => {
      const photoCandidate =
        (Array.isArray(r.prestataire?.galerie) && r.prestataire?.galerie.find((u) => typeof u === 'string' && u.startsWith('http'))) ||
        (Array.isArray(r.prestataire?.photos) && r.prestataire?.photos.find((u) => typeof u === 'string' && u.startsWith('http'))) ||
        null
      return {
        id: r.id,
        demande_id: r.demande_id,
        user_id: r.user_id,
        content: r.content,
        prestataire_id: r.prestataire_id,
        flag_count: r.flag_count,
        is_hidden: r.is_hidden,
        helpful_count: r.helpful_count,
        created_at: r.created_at,
        updated_at: r.updated_at,
        author_prenom: r.author?.prenom ?? null,
        author_avatar_url: r.author?.avatar_url ?? null,
        prestataire: r.prestataire
          ? {
              id: r.prestataire.id,
              slug: r.prestataire.slug,
              nom: r.prestataire.nom,
              ville: r.prestataire.ville,
              note_moyenne: r.prestataire.note_moyenne,
              nb_avis: r.prestataire.nb_avis,
              photo_url: photoCandidate,
            }
          : null,
      }
    })

    return { ok: true, data: items }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Fallback sans JOIN explicite : 3 queries en parallèle.
 * Utilisé si les noms de contraintes FK ne matchent pas (cas edge).
 */
async function getResponsesFallback(
  demandeId: string,
): Promise<JeChercheResult<DemandeResponseWithProfile[]>> {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from('demande_responses')
    .select(
      'id, demande_id, user_id, content, prestataire_id, flag_count, is_hidden, helpful_count, created_at, updated_at',
    )
    .eq('demande_id', demandeId)
    .eq('is_hidden', false)
    .order('helpful_count', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return fail(error.message, error.code)
  const responses = (rows ?? []) as DemandeResponse[]
  if (responses.length === 0) return { ok: true, data: [] }

  const userIds = Array.from(new Set(responses.map((r) => r.user_id)))
  const prestaIds = Array.from(
    new Set(
      responses
        .map((r) => r.prestataire_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  )

  const [authorsRes, prestaRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, prenom, avatar_url')
      .in('user_id', userIds),
    prestaIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, slug, nom, ville, note_moyenne, nb_avis, photos, galerie')
          .in('id', prestaIds)
      : Promise.resolve({ data: [] as never[], error: null }),
  ])

  const authorsByUserId = new Map<
    string,
    { prenom: string | null; avatar_url: string | null }
  >()
  for (const a of authorsRes.data ?? []) {
    authorsByUserId.set(a.user_id, {
      prenom: a.prenom ?? null,
      avatar_url: a.avatar_url ?? null,
    })
  }

  const prestaById = new Map<
    string,
    {
      id: string
      slug: string
      nom: string
      ville: string
      note_moyenne: number
      nb_avis: number
      photo_url: string | null
    }
  >()
  for (const p of (prestaRes.data ?? []) as Array<{
    id: string
    slug: string
    nom: string
    ville: string
    note_moyenne: number
    nb_avis: number
    photos: string[] | null
    galerie: string[] | null
  }>) {
    const photoCandidate =
      (Array.isArray(p.galerie) && p.galerie.find((u) => typeof u === 'string' && u.startsWith('http'))) ||
      (Array.isArray(p.photos) && p.photos.find((u) => typeof u === 'string' && u.startsWith('http'))) ||
      null
    prestaById.set(p.id, {
      id: p.id,
      slug: p.slug,
      nom: p.nom,
      ville: p.ville,
      note_moyenne: p.note_moyenne,
      nb_avis: p.nb_avis,
      photo_url: photoCandidate,
    })
  }

  const items: DemandeResponseWithProfile[] = responses.map((r) => ({
    ...r,
    author_prenom: authorsByUserId.get(r.user_id)?.prenom ?? null,
    author_avatar_url: authorsByUserId.get(r.user_id)?.avatar_url ?? null,
    prestataire: r.prestataire_id
      ? (prestaById.get(r.prestataire_id) ?? null)
      : null,
  }))

  return { ok: true, data: items }
}

/**
 * 4 demandes pour le carrousel home : urgence DESC, created_at DESC,
 * status='open'. Utilisé par la section <TeamCherche /> sur app/page.tsx.
 */
export async function getDemandesForHomeCarousel(): Promise<
  JeChercheResult<DemandeWithProfile[]>
> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('demandes_feed')
      .select(
        'id, user_id, title, content, category, canton, city, country, urgency, status, flag_count, response_count, created_at, updated_at, prenom, avatar_url',
      )
      .eq('status', 'open')
      .order('urgency', { ascending: false }) // 'urgent' > 'normal' lexicalement
      .order('created_at', { ascending: false })
      .limit(4)
    if (error) return fail(error.message, error.code)
    return { ok: true, data: (data ?? []) as DemandeWithProfile[] }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

// ─── WRITE ─────────────────────────────────────────────────────────

/**
 * Création d'une demande. Validation Zod, auth requise (auth.uid()).
 */
export async function createDemande(
  input: unknown,
): Promise<JeChercheResult<Demande>> {
  const parsed = createDemandeSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Input invalide', 'validation')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    const { data, error } = await supabase
      .from('demandes')
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
        canton: parsed.data.canton ?? null,
        city: parsed.data.city ?? null,
        country: parsed.data.country,
        urgency: parsed.data.urgency,
      })
      .select(
        'id, user_id, title, content, category, canton, city, country, urgency, status, flag_count, response_count, created_at, updated_at',
      )
      .single()

    if (error || !data) return fail(error?.message ?? 'Insert failed', error?.code)
    return { ok: true, data: data as Demande }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Création d'une réponse. Vérifie que la demande existe + n'est pas hidden
 * (le RLS sur demandes empêche déjà de SELECT hidden).
 * Si prestataire_id fourni : vérifie qu'il existe + status='approved'.
 */
export async function createResponse(
  input: unknown,
): Promise<JeChercheResult<DemandeResponse>> {
  const parsed = createResponseSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Input invalide', 'validation')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    // Vérifier que la demande existe + visible (RLS bloque si hidden)
    const { data: demande, error: dErr } = await supabase
      .from('demandes')
      .select('id, status')
      .eq('id', parsed.data.demande_id)
      .maybeSingle()
    if (dErr) return fail(dErr.message, dErr.code)
    if (!demande) return fail('Demande introuvable', 'not_found')
    if (demande.status === 'hidden' || demande.status === 'closed') {
      return fail('Demande non disponible', 'demande_unavailable')
    }

    // Si prestataire_id fourni : vérifier existence + approved
    if (parsed.data.prestataire_id) {
      const { data: presta, error: pErr } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('id', parsed.data.prestataire_id)
        .maybeSingle()
      if (pErr) return fail(pErr.message, pErr.code)
      if (!presta || presta.status !== 'approved') {
        return fail('Prestataire invalide', 'invalid_prestataire')
      }
    }

    const { data, error } = await supabase
      .from('demande_responses')
      .insert({
        demande_id: parsed.data.demande_id,
        user_id: user.id,
        content: parsed.data.content,
        prestataire_id: parsed.data.prestataire_id ?? null,
      })
      .select(
        'id, demande_id, user_id, content, prestataire_id, flag_count, is_hidden, helpful_count, created_at, updated_at',
      )
      .single()

    if (error || !data) return fail(error?.message ?? 'Insert failed', error?.code)
    return { ok: true, data: data as DemandeResponse }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Signaler une demande. Le trigger handle_demande_signalement incrémente
 * flag_count et auto-hide à 3.
 */
export async function signalDemande(
  demandeId: string,
  reason: SignalementReason,
  comment?: string | null,
): Promise<JeChercheResult<{ signalementId: string }>> {
  if (!z.string().uuid().safeParse(demandeId).success) {
    return fail('ID demande invalide', 'invalid_id')
  }
  const parsed = signalementSchema.safeParse({ reason, comment })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Input invalide', 'validation')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    const { data, error } = await supabase
      .from('demande_signalements')
      .insert({
        reporter_id: user.id,
        demande_id: demandeId,
        response_id: null,
        reason: parsed.data.reason,
        comment: parsed.data.comment ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      // Code 23505 = unique violation -> déjà signalé
      if (error?.code === '23505') {
        return fail('Tu as déjà signalé ce contenu.', 'duplicate')
      }
      return fail(error?.message ?? 'Insert failed', error?.code)
    }
    return { ok: true, data: { signalementId: data.id as string } }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Signaler une réponse. Même logique que signalDemande mais sur response_id.
 */
export async function signalResponse(
  responseId: string,
  reason: SignalementReason,
  comment?: string | null,
): Promise<JeChercheResult<{ signalementId: string }>> {
  if (!z.string().uuid().safeParse(responseId).success) {
    return fail('ID réponse invalide', 'invalid_id')
  }
  const parsed = signalementSchema.safeParse({ reason, comment })
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Input invalide', 'validation')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    const { data, error } = await supabase
      .from('demande_signalements')
      .insert({
        reporter_id: user.id,
        demande_id: null,
        response_id: responseId,
        reason: parsed.data.reason,
        comment: parsed.data.comment ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      if (error?.code === '23505') {
        return fail('Tu as déjà signalé ce contenu.', 'duplicate')
      }
      return fail(error?.message ?? 'Insert failed', error?.code)
    }
    return { ok: true, data: { signalementId: data.id as string } }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Toggle "merci copine" sur une réponse.
 * Insert si absent, delete si présent. Retourne le nouveau state.
 */
export async function toggleThanks(
  responseId: string,
): Promise<JeChercheResult<{ thanked: boolean }>> {
  if (!z.string().uuid().safeParse(responseId).success) {
    return fail('ID réponse invalide', 'invalid_id')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    // Lookup existant
    const { data: existing, error: lookupErr } = await supabase
      .from('demande_response_thanks')
      .select('response_id')
      .eq('response_id', responseId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (lookupErr) return fail(lookupErr.message, lookupErr.code)

    if (existing) {
      const { error: delErr } = await supabase
        .from('demande_response_thanks')
        .delete()
        .eq('response_id', responseId)
        .eq('user_id', user.id)
      if (delErr) return fail(delErr.message, delErr.code)
      return { ok: true, data: { thanked: false } }
    }

    const { error: insErr } = await supabase
      .from('demande_response_thanks')
      .insert({ response_id: responseId, user_id: user.id })
    if (insErr) {
      if (insErr.code === '23505') {
        return { ok: true, data: { thanked: true } } // race condition bénigne
      }
      return fail(insErr.message, insErr.code)
    }
    return { ok: true, data: { thanked: true } }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Marque une demande comme résolue. Owner-only (RLS update owner).
 */
export async function markResolved(
  demandeId: string,
): Promise<JeChercheResult<Demande>> {
  if (!z.string().uuid().safeParse(demandeId).success) {
    return fail('ID demande invalide', 'invalid_id')
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail('Non authentifiée', 'unauth')

    const { data, error } = await supabase
      .from('demandes')
      .update({ status: 'resolved' })
      .eq('id', demandeId)
      .eq('user_id', user.id) // double check owner
      .select(
        'id, user_id, title, content, category, canton, city, country, urgency, status, flag_count, response_count, created_at, updated_at',
      )
      .single()

    if (error || !data) return fail(error?.message ?? 'Update failed', error?.code)
    return { ok: true, data: data as Demande }
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Ré-export typé : catégories valides côté client (form select).
 */
export const JE_CHERCHE_CATEGORIES: readonly DemandeCategory[] = DEMANDE_CATEGORIES
export const JE_CHERCHE_COUNTRIES: readonly DemandeCountry[] = DEMANDE_COUNTRIES
