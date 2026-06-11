/**
 * Types TypeScript alignés sur le schéma Supabase après Stage 4.
 * Référence : /supabase/migrations/*.sql
 *
 * À importer dans toutes les queries (lib/supabase/queries/*) et dans
 * les composants qui consomment de la data live.
 */

/* ─────────────────────────────────────────────────────────────
   prestataires (table : profiles)
   ───────────────────────────────────────────────────────────── */

export type PrestataireStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ghost"
  | "paused";

export type PrestataireCategorie =
  | "beaute"
  | "bien-etre"
  | "sante-mentale"
  | "sport-nutrition"
  | "enfants-famille"
  | "maison"
  | "cuisine"
  | "evenementiel"
  | "mode-style"
  | "business-juridique"
  | "conseilleres-de-marque";

export type PrestataireSourceImport =
  | "google_places"
  | "instagram"
  | "linkedin"
  | "manuel";

export type PrestataireDevise = "CHF" | "EUR";
export type PrestataireGamme = "€" | "€€" | "€€€";

export interface PrestataireService {
  nom: string;
  prix: string;
  duree: string;
}

export interface Prestataire {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;

  // Identité
  nom: string;
  slug: string;
  categorie: PrestataireCategorie;

  // Localisation — colonnes optionnelles (pays/region/code_postal/zone_intervention
  // n'existent PAS encore dans la table profiles ; ajoutées via ALTER future si besoin).
  pays?: string;
  region?: string | null;
  ville: string;
  code_postal?: string | null;
  zone_intervention?: string | null;

  // Contenu
  description: string | null;
  tagline: string | null;

  // Contacts
  whatsapp: string;
  phone_public?: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook?: string | null;
  youtube?: string | null;
  linkedin: string | null;
  email: string | null;
  site_web: string | null;

  // Services + galerie (JSON)
  services: PrestataireService[];
  galerie: string[];
  photos: string[]; // ancienne colonne text[] — conservée pour compat

  // Tarification
  prix_from: number | null;
  prix_gamme: PrestataireGamme | null;
  devise: PrestataireDevise;

  // Modération
  status: PrestataireStatus;
  admin_notes: string | null;
  approved_at: string | null;
  source_import: PrestataireSourceImport;

  // Stats (maintenues par trigger)
  note_moyenne: number;
  nb_avis: number;
  nb_vues: number;

  // Palier d'abonnement (display-only V1 — sera renommé `tier` au Chantier 3)
  palier?: "standard" | "premium" | "cercle_pro";

  // Founder flag — accès Cercle Pro à vie (gratuit, sans abonnement Stripe).
  // ⚠️ Ne JAMAIS exposer côté public : strippé via toPublicPrestataire().
  is_founder?: boolean;

  // Réduction copines Hilmy (mig 62). pct ∈ {5,10,15,20} ou null (= pas de
  // réduction). Note = conditions libres. Les deux éditables librement par la
  // prestataire (volontairement HORS lock_profile_update).
  copine_discount_pct?: number | null;
  copine_discount_note?: string | null;
}

/* ─────────────────────────────────────────────────────────────
   places (lieux recommandés)
   ───────────────────────────────────────────────────────────── */

export type PlaceCategorie =
  | "restos-cafes"
  | "salons-the"
  | "boutiques"
  | "bien-etre"
  | "enfants"
  | "hebergements"
  | "sante"
  | "culturel"
  | "sport-nature";

export interface Place {
  id: string;
  google_place_id: string | null;

  name: string;
  slug: string | null;
  description: string | null;

  address: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;

  google_category: string | null;
  hilmy_category: PlaceCategorie | null;

  main_photo_url: string | null;
  photos: string[];

  // Tracking créateur (mig 28). NULL pour les fiches anté-Phase 1.
  created_by_user_id?: string | null;

  // Sélection Hilmy (mig 41) — gating produit payant 39€/mois.
  // Default 'aucun'. Lecture via getEffectivePalierLieu / hasSelectionHilmy
  // (lib/permissions-lieux.ts) — ne PAS lire palier brut côté UI.
  palier?: LieuPalier;

  // Compteur cumulé des vues (mig 41), bumpé atomiquement par trigger
  // sur place_views. Default 0.
  nb_vues?: number;

  created_at: string;
  updated_at: string;
}

/* Type re-export aligné avec lib/permissions-lieux.ts. Source unique
 * du set de valeurs : `LieuPalier` côté permissions-lieux. */
export type LieuPalier = 'aucun' | 'selection_hilmy';

/* ─────────────────────────────────────────────────────────────
   events
   ───────────────────────────────────────────────────────────── */

export type EventStatus = "published" | "flagged" | "removed" | "past";
export type EventFormat = "presentiel" | "en_ligne";
export type EventVisibility = "public" | "members_only";
export type EventPriceType = "gratuit" | "payant";
export type EventRegistrationMode = "internal" | "external" | "info_only";

export interface HilmyEvent {
  id: string;
  user_id: string;
  prestataire_id: string | null;
  // FK vers places(id) — mig 41. NULL pour les events historiques ou
  // ceux non rattachés à un lieu. Un event peut être tied à un presta
  // ET/OU à un lieu (pas de XOR).
  place_id?: string | null;

  title: string;
  slug: string | null;
  description: string;
  /** Free-text, affiché par eventTypeLabel() — préservé pour back-compat
   *  UI (home, dashboard, admin). Voir aussi boost_event_type. */
  event_type: string;
  /** Slug taxonomique (25 valeurs, mig 41) pour l'auto-boost lieu PR-D.
   *  NULL si event antérieur à mig 41 ou sans rattachement Sélection Hilmy.
   *  Type strict importé depuis lib/event-types.ts pour éviter dérive. */
  boost_event_type?: import('@/lib/event-types').EventType | null;
  format: EventFormat;
  visibility: EventVisibility;

  start_date: string;
  end_date: string | null;

  country: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  online_link: string | null;

  flyer_url: string;
  external_signup_url: string | null;

  price_type: EventPriceType;
  price_amount: number | null;
  price_currency: string | null;

  places_max: number | null;
  inscrites_count: number;

  status: EventStatus;
  registration_mode: EventRegistrationMode;
  /** Pass Copine (mig 50). Si non-NULL et > now(), seules les
   *  utilisatrices Copines peuvent s'inscrire jusqu'à cette date.
   *  Passé cette date, ouvert à tout le monde. NULL = pas de fenêtre
   *  Copines. */
  early_access_until: string | null;
  created_at: string;
  updated_at: string;

  /** FK optionnelle vers event_seasonal_categories (mig 46 PR-F).
   *  Drive les filtres saisonniers /événements + badge card. */
  event_seasonal_category_id?: string | null;
  /** Pré-fetché via LEFT JOIN PostgREST quand utile (page feed
   *  /evenements-v2). NULL si pas de catégorie saisonnière sélectionnée. */
  event_seasonal_category?: {
    id: string;
    slug: string;
    label: string;
    emoji: string;
  } | null;
}

/* ─────────────────────────────────────────────────────────────
   recommendations (polymorphique)
   ───────────────────────────────────────────────────────────── */

export type RecommendationType = "place" | "prestataire";
export type RecommendationStatus = "published" | "flagged" | "removed";

export interface Recommendation {
  id: string;
  user_id: string;
  type: RecommendationType;

  place_id: string | null;
  profile_id: string | null;

  comment: string;
  rating: number | null;
  tags: string[] | null;
  price_indicator: string | null;
  photo_urls: string[] | null;

  // Réponse pro (uniquement quand type='prestataire')
  reponse_pro: string | null;
  reponse_date: string | null;

  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
   favoris (polymorphique, owner-only)
   ───────────────────────────────────────────────────────────── */

export type FavoriType = "prestataire" | "lieu" | "evenement";

export interface Favori {
  id: string;
  user_id: string;
  type_item: FavoriType;
  item_id: string;
  note_perso: string | null;
  created_at: string;
}

/* ─────────────────────────────────────────────────────────────
   event_inscriptions (RSVP)
   ───────────────────────────────────────────────────────────── */

export type InscriptionStatus = "inscrite" | "annulee" | "liste_attente";

export interface EventInscription {
  id: string;
  event_id: string;
  user_id: string;
  status: InscriptionStatus;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
   user_profiles (méta user — table existante, intouchée Stage 4)
   ───────────────────────────────────────────────────────────── */

/** Tranche d'âge collectée à l'onboarding (Batch B 04/2026) ou via
 *  modale opt-in (Batch C 04/2026). Pseudonymisée — pas d'âge exact. */
export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55+';

/** Clés stockées dans user_profiles.preferences.notifications (migration 33). */
export interface NotificationPrefs {
  emailWeekly: boolean;
  emailEvenements: boolean;
  emailNouvelles: boolean;
  notifCommentaires: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  emailWeekly: true,
  emailEvenements: true,
  emailNouvelles: false,
  notifCommentaires: true,
};

export interface UserProfile {
  id: string;
  user_id: string;
  prenom: string;
  pays: string;
  ville: string;
  signupType: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Optionnel — nullable côté DB depuis migration 22. Les utilisatrices
   *  existantes ont NULL tant qu'elles n'ont pas complété la modale opt-in. */
  age_range: AgeRange | null;
  /** Préférences évolutives (jsonb, default {}). Clés notifications dans .notifications.
   *  Type ouvert pour autres clés futures sans casser le typage. */
  preferences: { notifications?: Partial<NotificationPrefs>; [key: string]: unknown } | null;
  /** Pass Copine (mig 50). is_copine=true ⇔ abo Stripe Copine actif/trialing/past_due.
   *  Modifié exclusivement par /api/stripe/webhook. À ne pas confondre avec
   *  GamificationStatut='Copine' (niveau 20-99 points, free). */
  is_copine: boolean;
  /** Timestamp du premier checkout Copine réussi. Préservé après unsubscribe
   *  pour analytics fidélité. NULL si jamais souscrit. */
  copine_since: string | null;
  /** FK vers Stripe customer attaché au flow Pass Copine. Peut être identique
   *  à profiles.stripe_customer_id si la même personne est aussi prestataire. */
  copine_stripe_customer_id: string | null;
  created_at: string;
}

/* ─────────────────────────────────────────────────────────────
   voix_hilmy_public (vue SECURITY DEFINER, migration 26)
   ───────────────────────────────────────────────────────────── */

/** Ligne de la vue voix_hilmy_public — données publiques d'une Voix. */
export interface VoixPublic {
  /** auth.users.id, clé d'agrégation pour follow/recos/counter */
  user_id: string;
  prenom: string;
  slug: string;
  bio: string;
  activated_at: string;
  recos_count: number;
  followers_count: number;
}

/**
 * Ligne de la vue voix_hilmy_recos_public (mig 27) — reco publiée par
 * une Voix Hilmy active, jointe avec place ou profile selon type.
 *
 * Edge cases : les colonnes place_* sont NULL si type='prestataire'
 * ou si le place a été supprimé. Les colonnes profile_* sont NULL si
 * type='place' ou si profile.status != 'approved'. Le frontend doit
 * skip / fallback les rows incomplètes.
 */
export interface VoixPublicReco {
  id: string;
  /** auth.users.id de la Voix auteur */
  voix_user_id: string;
  type: "place" | "prestataire";
  /** Toujours non-vide (filtre dans la vue) */
  comment: string;
  created_at: string;

  place_id: string | null;
  place_name: string | null;
  place_city: string | null;
  place_slug: string | null;

  profile_id: string | null;
  profile_nom: string | null;
  profile_ville: string | null;
  profile_slug: string | null;
}

/* ─────────────────────────────────────────────────────────────
   place_views (tracking pageview lieu — mig 41)
   ───────────────────────────────────────────────────────────── */

/** Une ligne = une visite de fiche lieu. Anonyme OK (viewer_id NULL).
 *  Mirror de profile_views (mig 15). */
export interface PlaceView {
  id: string;
  place_id: string;
  viewer_id: string | null;
  viewed_at: string;
  country: string | null;
  region: string | null;
  city: string | null;
  referer: string | null;
  user_agent_hash: string | null;
}

/* ─────────────────────────────────────────────────────────────
   place_contacts (tracking tap-to-contact lieu — mig 41)
   ───────────────────────────────────────────────────────────── */

export type PlaceContactType =
  | 'phone'
  | 'website'
  | 'email'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'youtube'
  | 'google_maps'
  | 'whatsapp';

/** Une ligne = un clic sur un canal contact d'une fiche lieu.
 *  Mirror profile_contacts (mig 15). */
export interface PlaceContact {
  id: string;
  place_id: string;
  clicker_id: string | null;
  contact_type: PlaceContactType;
  clicked_at: string;
  country: string | null;
  region: string | null;
  city: string | null;
  referer: string | null;
}

/* ─────────────────────────────────────────────────────────────
   events_config_admin (config auto-boost par catégorie — mig 41)
   ───────────────────────────────────────────────────────────── */

/** Ligne par event_type (les 25 slugs). Modifiable côté admin via
 *  /admin/events-config (PR-D). Lue par is_lieu_boosted (PR-D). */
export interface EventsConfigAdmin {
  id: string;
  /** L'un des 25 slugs — type strict importé depuis lib/event-types.ts. */
  event_type: import('@/lib/event-types').EventType;
  boost_enabled: boolean;
  /** Nombre de jours avant l'event où la fiche lieu est mise en avant. */
  boost_days_before: number;
  /** Si true, la mise en avant se prolonge jusqu'à end_date (ou +1j si NULL). */
  boost_until_event_end: boolean;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
   profile_videos (vidéos prestataires — mig 43)
   ───────────────────────────────────────────────────────────── */

/** Vidéo MP4 attachée à une fiche prestataire (Premium 60s × 1,
 *  Cercle Pro 90s × illimitées). Cap par palier appliqué côté API
 *  route en PR-3. Le CHECK BDD borne dur à 90s / 50MB. */
export interface ProfileVideo {
  id: string;
  profile_id: string;
  /** Path interne au bucket profile-videos, format `{user_id}/{nanoid}.mp4`
   *  (cf storage_owner_from_path mig 08 + storage convention). */
  storage_path: string;
  /** Path interne au bucket profile-videos pour le thumbnail JPEG.
   *  NULL si la génération ffmpeg.wasm a échoué (vidéo reste utilisable). */
  thumbnail_storage_path: string | null;
  duration_seconds: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
   place_videos (vidéos lieux Sélection Hilmy — mig 43)
   ───────────────────────────────────────────────────────────── */

/** Vidéo MP4 attachée à une fiche lieu Sélection Hilmy (90s × illimitées).
 *  Mirror ProfileVideo. Owner = places.created_by_user_id (mig 28). */
export interface PlaceVideo {
  id: string;
  place_id: string;
  storage_path: string;
  thumbnail_storage_path: string | null;
  duration_seconds: number;
  size_bytes: number;
  created_at: string;
  updated_at: string;
}

/* ─────────────────────────────────────────────────────────────
   Résultat standardisé des queries (gestion d'erreur uniforme)
   ───────────────────────────────────────────────────────────── */

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };


/* ─────────────────────────────────────────────────────────────
   Abonnements Stripe prestataires (mig 49 — Sprint 7)
   ─────────────────────────────────────────────────────────────
   Mirror local du state Stripe pour gating palier rapide côté UI.
   Updates exclusivement via /api/stripe/webhook (service_role).
   Sélection Hilmy lieux déférée Sprint 7bis (pas dans le CHECK ici). */

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid';

export type SubscriptionPalier = 'standard' | 'premium' | 'cercle_pro';
export type SubscriptionDureeMonths = 1 | 3 | 6 | 12;

export interface Subscription {
  id: string;
  profile_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  palier: SubscriptionPalier;
  duree_months: SubscriptionDureeMonths;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}


/* ─────────────────────────────────────────────────────────────
   copine_subscriptions (mig 50) — Pass Copine utilisatrices

   Mirror local des abos Stripe Pass Copine. Parallèle à Subscription
   ci-dessus qui couvre les paliers prestataires (mig 49). Updates
   exclusivement via /api/stripe/webhook (service_role bypass RLS).
   ───────────────────────────────────────────────────────────── */

export type CopinePlan = 'monthly' | 'annual';

export interface CopineSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan: CopinePlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}


/* ─────────────────────────────────────────────────────────────
   pro_perks + pro_perk_claims (mig 50) — Offres Cercle Pro
   pour les Copines.

   Les prestataires Cercle Pro créent des perks (status='pending_review'),
   un admin modère (→ 'active' OU 'rejected' + rejection_reason), puis
   les Copines actives peuvent claim chaque perk une fois (UNIQUE perk_id
   × user_id), recevant un code unique HILMY-XXXX-YYYY.

   ⚠️ INSERT pro_perk_claims est gaté DB-side par la SECURITY DEFINER
   function is_user_copine(auth.uid()) — voir mig 50 §3. Tout INSERT
   doit aussi être gaté côté API route (defense-in-depth Phase 5 D5).
   ───────────────────────────────────────────────────────────── */

export type ProPerkStatus =
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'expired'
  | 'rejected';

export type ProPerkDiscountType = 'percentage' | 'fixed';

export interface ProPerk {
  id: string;
  prestataire_profile_id: string;
  title: string;
  description: string | null;
  discount_type: ProPerkDiscountType;
  /** numeric côté DB — exposé en number côté TS. % si discount_type =
   *  'percentage' (0-100), montant absolu si 'fixed' (devise = celle du
   *  prestataire — non typée ici, le front affiche "X €" par défaut). */
  discount_value: number;
  conditions: string | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string;
  ends_at: string | null;
  status: ProPerkStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProPerkClaim {
  id: string;
  perk_id: string;
  user_id: string;
  /** Format HILMY-XXXX-YYYY (contrainte CHECK regex côté DB). Généré
   *  côté server-side via crypto.randomBytes — jamais côté client. */
  code_displayed: string;
  marked_used_at: string | null;
  created_at: string;
}


/* ─────────────────────────────────────────────────────────────
   Gamification utilisatrices (mig 16 + backfill mig 48 — Sprint U1.5)
   ─────────────────────────────────────────────────────────────
   Aligné sur la BDD réelle :
    - point_events : log immuable, écriture exclusivement via triggers
      SECURITY DEFINER (cf mig 16). Colonne s'appelle `event_type` (PAS
      `kind`).
    - user_gamification : vue calculée à la volée. N'expose que ces 4
      colonnes — pas de recos_count/events_count (à dériver via query
      séparée si besoin un jour).
   Niveaux hardcodés dans la vue SQL : Nouvelle 0-19 | Copine 20-99 |
   Pilier 100-299 | Légende 300+. Garder synchro avec lib/supabase/
   queries/gamification.ts. */

export type GamificationStatut = 'Nouvelle' | 'Copine' | 'Pilier' | 'Légende';

export type PointEventType =
  | 'reco_published'
  | 'event_published'
  | 'reco_saved_by_other';

export interface PointEvent {
  id: string;
  user_id: string;
  source_id: string;
  event_type: PointEventType;
  points: number;
  created_at: string;
}

export interface UserGamification {
  user_id: string;
  total_points: number;
  statut: GamificationStatut;
  derniere_activite: string | null;
}


/* ─────────────────────────────────────────────────────────────
   Catégories saisonnières d'événements (mig 44 + 45)
   ─────────────────────────────────────────────────────────────
   Initialement créée par PR-D pour le boost prestataire (scope
   abandonné). La table `seasonal_event_windows` est renommée
   `event_seasonal_categories` via mig 45 et sert désormais de
   référentiel pour les filtres saisonniers de la page /événements
   (PR-F à venir). */

export interface EventSeasonalCategory {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
