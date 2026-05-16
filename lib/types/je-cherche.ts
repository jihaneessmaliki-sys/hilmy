/**
 * Types du module "Je cherche..." (Phase 6).
 * Source de vérité : supabase/migrations/38_je_cherche.sql
 */

export type DemandeStatus = 'open' | 'resolved' | 'hidden' | 'closed'
export type DemandeUrgency = 'normal' | 'urgent'
export type SignalementReason =
  | 'spam'
  | 'inapproprie'
  | 'harcelement'
  | 'autre'
export type DemandeCountry = 'CH' | 'FR' | 'BE' | 'LU' | 'MC'

/**
 * Catégorie d'une demande.
 * Aligne sur PrestataireCategorie (lib/constants.ts CATEGORIES_MAP) + 'autre'
 * pour les demandes hors-annuaire (ex: "je cherche un appartement").
 */
export type DemandeCategory =
  | 'beaute'
  | 'bien-etre'
  | 'sante-mentale'
  | 'sport-nutrition'
  | 'enfants-famille'
  | 'maison'
  | 'cuisine'
  | 'evenementiel'
  | 'mode-style'
  | 'business-juridique'
  | 'conseilleres-de-marque'
  | 'autre'

export interface Demande {
  id: string
  user_id: string
  title: string
  content: string
  category: DemandeCategory
  canton: string | null
  city: string | null
  country: DemandeCountry
  urgency: DemandeUrgency
  status: DemandeStatus
  flag_count: number
  response_count: number
  created_at: string
  updated_at: string
}

/**
 * Demande enrichie via VIEW demandes_feed (LEFT JOIN user_profiles).
 * prenom et avatar_url peuvent être null si l'auteur n'a pas de profil
 * (cas edge : compte créé sans onboarding terminé).
 */
export interface DemandeWithProfile extends Demande {
  prenom: string | null
  avatar_url: string | null
  /** Pass Copine (mig 50). Phase 6 : drive le badge `<MemberName>`. */
  author_is_copine: boolean | null
  author_copine_since: string | null
}

export interface DemandeResponse {
  id: string
  demande_id: string
  user_id: string
  content: string
  prestataire_id: string | null
  flag_count: number
  is_hidden: boolean
  helpful_count: number
  created_at: string
  updated_at: string
}

/**
 * Réponse enrichie : auteur (prenom/avatar) + prestataire recommandé
 * (snapshot minimal pour rendu card).
 */
export interface DemandeResponseWithProfile extends DemandeResponse {
  author_prenom: string | null
  author_avatar_url: string | null
  /** Pass Copine (mig 50). Phase 6 : drive le badge `<MemberName>`. */
  author_is_copine: boolean | null
  author_copine_since: string | null
  prestataire?: {
    id: string
    slug: string
    nom: string
    ville: string
    note_moyenne: number
    nb_avis: number
    photo_url: string | null
  } | null
}

export interface Signalement {
  id: string
  reporter_id: string
  demande_id: string | null
  response_id: string | null
  reason: SignalementReason
  comment: string | null
  created_at: string
}

export interface ResponseThanks {
  response_id: string
  user_id: string
  created_at: string
}

/**
 * Filtres optionnels pour le feed /je-cherche.
 */
export interface DemandeFilters {
  category?: DemandeCategory | null
  country?: DemandeCountry | null
  canton?: string | null
  urgencyOnly?: boolean
}

export interface PaginationCursor {
  before?: string // ISO timestamp created_at
  limit?: number // default 24, max 100
}

/**
 * Résultat paginé du feed (cursor-based pour scroll infini).
 */
export interface PaginatedDemandes {
  items: DemandeWithProfile[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Constantes safe-côté-client (pas de server import). Pour les forms
 * et selects React.
 */
export const JE_CHERCHE_CATEGORIES: readonly DemandeCategory[] = [
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
]

export const JE_CHERCHE_COUNTRIES: readonly DemandeCountry[] = [
  'CH',
  'FR',
  'BE',
  'LU',
  'MC',
]
