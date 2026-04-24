// =====================================================================
// STAGE 5/8 · Feature flag LAUNCH_MODE (pilotable via env)
// =====================================================================
// Contrôlé par NEXT_PUBLIC_LAUNCH_MODE côté env.
//   "mock" (défaut) → listings publics en état "jour 1", fiches via mock-data.
//   "live"          → lecture live Supabase (tables profiles/places/events)
//                     avec skeletons, états vides, messages d'erreur soignés.
//
// En prod Vercel : mettre NEXT_PUBLIC_LAUNCH_MODE=live.
// En dev local : omettre ou mettre "mock" dans .env.local.
// =====================================================================
type LaunchMode = "mock" | "live";
export const LAUNCH_MODE: LaunchMode =
  (process.env.NEXT_PUBLIC_LAUNCH_MODE as LaunchMode | undefined) === "live"
    ? "live"
    : "mock";

export const isLive = () => LAUNCH_MODE === "live";
export const isMock = () => LAUNCH_MODE === "mock";


// ─── Provider categories (prestataires) · 10 catégories V2 ─
// Alignées sur CHECK constraint profiles_categorie_check (01_alter_profiles.sql)
export const CATEGORIES_MAP: Record<string, string> = {
  "beaute": "Beauté",
  "bien-etre": "Bien-être",
  "sante-mentale": "Santé mentale",
  "sport-nutrition": "Sport & Nutrition",
  "enfants-famille": "Enfants & Famille",
  "maison": "Maison",
  "cuisine": "Cuisine",
  "evenementiel": "Événementiel",
  "mode-style": "Mode & Style",
  "business-juridique": "Business & Juridique",
};

export const CATEGORIES_DESCRIPTIONS: Record<string, string> = {
  "beaute": "Pour les jours où tu as envie de te faire chouchouter.",
  "bien-etre": "Pour souffler, respirer, se retrouver — entre nous.",
  "sante-mentale": "Thérapeutes, coachs, praticiennes. Parce qu'on va mieux entourée.",
  "sport-nutrition": "Bouger, manger, comprendre son corps — sans injonctions.",
  "enfants-famille": "Parce qu'on confie ses petits qu'à des mains qu'on connaît.",
  "maison": "Pour un chez-soi qui te ressemble, tenu par des mains sûres.",
  "cuisine": "Parce que les meilleures recettes se passent entre nous.",
  "evenementiel": "Pour les fêtes qu'on n'oublie jamais.",
  "mode-style": "Pour les retouches parfaites et les looks qui te ressemblent.",
  "business-juridique": "Parler argent, stratégie, papiers. Plus simple entre femmes.",
};

export const CATEGORIES = Object.keys(CATEGORIES_MAP);

// ─── Place categories (lieux) · 9 catégories V2 ──────────
// Alignées sur CHECK constraint places_hilmy_category_check (02_alter_places.sql)
export const PLACE_CATEGORIES_MAP: Record<string, string> = {
  "restos-cafes": "Restos & Cafés",
  "salons-the": "Salons de thé",
  "boutiques": "Boutiques",
  "bien-etre": "Spas & Bien-être",
  "enfants": "Sorties enfants",
  "hebergements": "Hôtels & Séjours",
  "sante": "Santé",
  "culturel": "Lieux culturels",
  "sport-nature": "Sport & Nature",
};

export const PLACE_CATEGORIES_DESCRIPTIONS: Record<string, string> = {
  "restos-cafes": "Les tables qu'on a aimées et qu'on referait.",
  "salons-the": "Pour les pauses douceur entre copines.",
  "boutiques": "Les adresses mode, déco et concept stores qu'on se chuchote.",
  "bien-etre": "Spas, hammams et massages pour souffler un peu.",
  "enfants": "Les endroits où les petits sont rois.",
  "hebergements": "Les nuits douces qu'on a testées pour toi.",
  "sante": "Médecins femmes, gynécos, sages-femmes et dentistes de confiance.",
  "culturel": "Musées, galeries et librairies qu'on a adorés.",
  "sport-nature": "Clubs, salles et sentiers où on se sent bien.",
};

export const PLACE_CATEGORIES = Object.keys(PLACE_CATEGORIES_MAP);

// ─── Countries ────────────────────────────────────────────
export const PAYS_MAP: Record<string, string> = {
  "Suisse": "Suisse",
  "France": "France",
  "Belgique": "Belgique",
  "Luxembourg": "Luxembourg",
  "Monaco": "Monaco",
};

export const PAYS = Object.keys(PAYS_MAP);

// ─── Recommendation tags ──────────────────────────────────
export const REC_TAGS_MAP: Record<string, string> = {
  "avec-enfants": "Avec enfants",
  "en-couple": "En couple",
  "entre-copines": "Entre copines",
  "pour-le-boulot": "Pour le boulot",
  "pour-une-occasion": "Pour une occasion",
};

export const REC_TAGS = Object.keys(REC_TAGS_MAP);

// ─── Diet tags (restos & salons de thé uniquement) ────────
export const DIET_TAGS_MAP: Record<string, string> = {
  "halal": "Halal",
  "casher": "Casher",
  "vegetarien": "Végétarien",
  "vegan": "Vegan",
  "sans-gluten": "Sans gluten",
};

export const DIET_TAGS = Object.keys(DIET_TAGS_MAP);

export function dietTagLabel(slug: string): string {
  return DIET_TAGS_MAP[slug] ?? slug;
}

/** Catégories HILMY où le choix de régime alimentaire est pertinent. */
export const DIET_CATEGORIES = new Set(["restos-cafes", "salons-the"]);

// ─── Types ────────────────────────────────────────────────
export type ProfileStatus = "pending" | "approved" | "rejected" | "ghost";

export interface Profile {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  nom: string;
  slug: string;
  categorie: string;
  pays: string;
  region: string | null;
  ville: string;
  code_postal: string | null;
  zone_intervention: string | null;
  description: string | null;
  whatsapp: string;
  instagram: string | null;
  tiktok: string | null;
  photos: string[];
  status: ProfileStatus;
  admin_notes: string | null;
}

export interface Place {
  id: string;
  google_place_id: string | null;
  name: string;
  address: string;
  city: string;
  region: string | null;
  country: string;
  latitude: number;
  longitude: number;
  google_category: string | null;
  hilmy_category: string;
  main_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  type: "place" | "prestataire";
  place_id: string | null;
  profile_id: string | null;
  comment: string;
  rating: number | null;
  tags: string[] | null;
  price_indicator: string | null;
  photo_urls: string[] | null;
  status: "published" | "flagged" | "removed";
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  prenom: string;
  pays: string;
  ville: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  profile_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
}

export function categoryLabel(slug: string): string {
  return CATEGORIES_MAP[slug] ?? slug;
}

export function placeCategoryLabel(slug: string): string {
  return PLACE_CATEGORIES_MAP[slug] ?? slug;
}

export function recTagLabel(slug: string): string {
  return REC_TAGS_MAP[slug] ?? slug;
}

// ─── Event types ──────────────────────────────────────────
export const EVENT_TYPES_MAP: Record<string, string> = {
  "atelier": "Atelier",
  "conference": "Conférence",
  "brunch": "Brunch",
  "sport": "Sport",
  "soiree": "Soirée",
  "retraite": "Retraite",
  "marche": "Marché",
  "masterclass": "Masterclass",
  "autre": "Autre",
};

export const EVENT_TYPES = Object.keys(EVENT_TYPES_MAP);

export function eventTypeLabel(slug: string): string {
  return EVENT_TYPES_MAP[slug] ?? slug;
}

export interface HilmyEvent {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_type: string;
  format: "presentiel" | "en_ligne";
  start_date: string;
  end_date: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  online_link: string | null;
  flyer_url: string;
  external_signup_url: string | null;
  price_type: "gratuit" | "payant";
  price_amount: number | null;
  price_currency: string | null;
  status: "published" | "flagged" | "removed" | "past";
  created_at: string;
  updated_at: string;
}
