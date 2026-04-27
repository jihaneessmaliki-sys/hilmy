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

  created_at: string;
  updated_at: string;
}

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

  title: string;
  slug: string | null;
  description: string;
  event_type: string;
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
  created_at: string;
  updated_at: string;
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

export interface UserProfile {
  id: string;
  user_id: string;
  prenom: string;
  pays: string;
  ville: string;
  signupType: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

/* ─────────────────────────────────────────────────────────────
   Résultat standardisé des queries (gestion d'erreur uniforme)
   ───────────────────────────────────────────────────────────── */

export type QueryResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
