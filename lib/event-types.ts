/**
 * Taxonomie events pour l'auto-boost lieu (Phase 2A · PR-D).
 *
 * ⚠️ NE PAS CONFONDRE avec `events.event_type` (free-text affiché par
 * eventTypeLabel() dans lib/constants.ts — toujours en place pour la
 * home, le dashboard utilisatrice, l'admin). Ces 25 slugs alimentent
 * UNIQUEMENT la nouvelle colonne `events.boost_event_type` ajoutée par
 * la migration 41, qui drive le système d'auto-mise-en-avant des fiches
 * lieux Sélection Hilmy.
 *
 * Source de vérité : la liste DOIT rester strictement alignée avec :
 *   - le CHECK constraint `events_boost_event_type_check`
 *     (supabase/migrations/41_selection_hilmy_foundations.sql, section 3)
 *   - le CHECK constraint `events_config_admin_event_type_check`
 *     (idem migration 41, section 7)
 *   - le seed initial de events_config_admin (idem, section 7)
 *
 * Ajouter un slug = migration BDD nouvelle (CHECK + seed). Renommer un
 * slug = migration de données. Ne pas modifier en TS sans synchroniser.
 */

export type EventType =
  // Restauration / convivialité
  | 'brunch_copines'
  | 'diner_thematique'
  | 'soiree_iftar_ramadan'
  | 'apero_afterwork'
  // Beauté / bien-être
  | 'atelier_decouverte'
  | 'journee_portes_ouvertes'
  | 'masterclass_beaute'
  | 'retraite_bien_etre'
  // Shopping / créatrices
  | 'pop_up_ephemere'
  | 'vente_privee_copines'
  | 'lancement_collection'
  | 'marche_creatrices'
  // Religieux / culturel
  | 'preparation_aid'
  | 'soiree_henne'
  // Saisonnier laïque
  | 'saint_valentin'
  | 'fete_des_meres'
  | 'ete_vacances'
  | 'rentree'
  | 'black_friday'
  | 'fetes_fin_annee'
  // Lifestyle / pro
  | 'soiree_privee_copines'
  | 'atelier_creatif'
  | 'conference_talk'
  | 'workshop_business'
  // Fallback
  | 'autre'

/** Catégories pour le grouping UI (form select dropdown PR-D). */
export type EventTypeCategory =
  | 'restauration'
  | 'beaute'
  | 'shopping'
  | 'religieux_culturel'
  | 'saisonnier_laic'
  | 'lifestyle'
  | 'autre'

/**
 * Mapping slug → catégorie. Utilisé par PR-D pour grouper les options
 * du select "Type d'event" dans le form de création/édition d'event lieu.
 */
export const EVENT_TYPE_CATEGORIES: Record<EventType, EventTypeCategory> = {
  // Restauration / convivialité
  brunch_copines: 'restauration',
  diner_thematique: 'restauration',
  soiree_iftar_ramadan: 'restauration',
  apero_afterwork: 'restauration',
  // Beauté / bien-être
  atelier_decouverte: 'beaute',
  journee_portes_ouvertes: 'beaute',
  masterclass_beaute: 'beaute',
  retraite_bien_etre: 'beaute',
  // Shopping / créatrices
  pop_up_ephemere: 'shopping',
  vente_privee_copines: 'shopping',
  lancement_collection: 'shopping',
  marche_creatrices: 'shopping',
  // Religieux / culturel
  preparation_aid: 'religieux_culturel',
  soiree_henne: 'religieux_culturel',
  // Saisonnier laïque
  saint_valentin: 'saisonnier_laic',
  fete_des_meres: 'saisonnier_laic',
  ete_vacances: 'saisonnier_laic',
  rentree: 'saisonnier_laic',
  black_friday: 'saisonnier_laic',
  fetes_fin_annee: 'saisonnier_laic',
  // Lifestyle / pro
  soiree_privee_copines: 'lifestyle',
  atelier_creatif: 'lifestyle',
  conference_talk: 'lifestyle',
  workshop_business: 'lifestyle',
  // Fallback
  autre: 'autre',
}

/**
 * Labels FR voix Sara (tutoiement, ton copine, pas corporate).
 * Affiché côté form (dropdown) et côté admin (page /admin/events-config).
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  // Restauration / convivialité
  brunch_copines: 'Brunch copines',
  diner_thematique: 'Dîner thématique',
  soiree_iftar_ramadan: 'Soirée iftar (Ramadan)',
  apero_afterwork: 'Apéro afterwork',
  // Beauté / bien-être
  atelier_decouverte: 'Atelier découverte',
  journee_portes_ouvertes: 'Journée portes ouvertes',
  masterclass_beaute: 'Masterclass beauté',
  retraite_bien_etre: 'Retraite bien-être',
  // Shopping / créatrices
  pop_up_ephemere: 'Pop-up éphémère',
  vente_privee_copines: 'Vente privée copines',
  lancement_collection: 'Lancement de collection',
  marche_creatrices: 'Marché de créatrices',
  // Religieux / culturel
  preparation_aid: 'Préparation Aïd',
  soiree_henne: 'Soirée henné',
  // Saisonnier laïque
  saint_valentin: 'Saint-Valentin',
  fete_des_meres: 'Fête des mères',
  ete_vacances: 'Été / vacances',
  rentree: 'Rentrée',
  black_friday: 'Black Friday',
  fetes_fin_annee: 'Fêtes de fin d’année',
  // Lifestyle / pro
  soiree_privee_copines: 'Soirée privée copines',
  atelier_creatif: 'Atelier créatif',
  conference_talk: 'Conférence / talk',
  workshop_business: 'Workshop business',
  // Fallback
  autre: 'Autre',
}

/** Labels FR pour les groupes de catégories (header optgroup form). */
export const EVENT_TYPE_CATEGORY_LABELS: Record<EventTypeCategory, string> = {
  restauration: 'Restauration & convivialité',
  beaute: 'Beauté & bien-être',
  shopping: 'Shopping & créatrices',
  religieux_culturel: 'Religieux & culturel',
  saisonnier_laic: 'Saisonnier',
  lifestyle: 'Lifestyle & pro',
  autre: 'Autre',
}

/** Tous les slugs, pour itération (form select, validation Zod, etc.). */
export const EVENT_TYPES: readonly EventType[] = [
  'brunch_copines',
  'diner_thematique',
  'soiree_iftar_ramadan',
  'apero_afterwork',
  'atelier_decouverte',
  'journee_portes_ouvertes',
  'masterclass_beaute',
  'retraite_bien_etre',
  'pop_up_ephemere',
  'vente_privee_copines',
  'lancement_collection',
  'marche_creatrices',
  'preparation_aid',
  'soiree_henne',
  'saint_valentin',
  'fete_des_meres',
  'ete_vacances',
  'rentree',
  'black_friday',
  'fetes_fin_annee',
  'soiree_privee_copines',
  'atelier_creatif',
  'conference_talk',
  'workshop_business',
  'autre',
] as const

/** Type guard runtime — utile pour valider un payload form/API. */
export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
}

/**
 * Liste groupée par catégorie, dans l'ordre d'affichage du form select.
 * Ordre des catégories aligné sur le brief Phase 2A (restauration en
 * premier, "autre" en dernier).
 */
export const EVENT_TYPES_BY_CATEGORY: {
  category: EventTypeCategory
  label: string
  types: { value: EventType; label: string }[]
}[] = (
  [
    'restauration',
    'beaute',
    'shopping',
    'religieux_culturel',
    'saisonnier_laic',
    'lifestyle',
    'autre',
  ] as EventTypeCategory[]
).map((category) => ({
  category,
  label: EVENT_TYPE_CATEGORY_LABELS[category],
  types: EVENT_TYPES.filter((t) => EVENT_TYPE_CATEGORIES[t] === category).map(
    (t) => ({ value: t, label: EVENT_TYPE_LABELS[t] }),
  ),
}))
