// ─── Provider categories (prestataires) ───────────────────
export const CATEGORIES_MAP: Record<string, string> = {
  "beaute": "Beauté",
  "enfants": "Enfants",
  "evenementiel": "Événementiel",
  "cuisine": "Cuisine",
  "sport": "Sport",
  "mode": "Mode",
  "maison": "Maison",
  "droit-finances": "Droit & finances",
  "conseilleres-marque": "Conseillères de marque",
};

export const CATEGORIES_DESCRIPTIONS: Record<string, string> = {
  "beaute": "Pour les jours où tu as envie de te faire chouchouter.",
  "enfants": "Parce qu'on confie ses petits qu'à des mains qu'on connaît.",
  "evenementiel": "Pour les fêtes qu'on n'oublie jamais.",
  "cuisine": "Parce que les meilleures recettes se passent entre nous.",
  "sport": "Pour bouger entre filles, sans prise de tête.",
  "mode": "Pour les retouches parfaites et les looks qui te ressemblent.",
  "maison": "Pour une maison qui te ressemble, tenue par des mains sûres.",
  "droit-finances": "Parce que parler argent et papiers, c'est plus simple entre femmes.",
  "conseilleres-marque": "Thermomix, Kobold et compagnie, par des filles qui savent les vendre et les utiliser.",
};

export const CATEGORIES = Object.keys(CATEGORIES_MAP);

// ─── Place categories (lieux) ─────────────────────────────
export const PLACE_CATEGORIES_MAP: Record<string, string> = {
  "restaurants-cafes": "Restaurants & cafés",
  "salons-the": "Salons de thé & pâtisseries",
  "boutiques": "Boutiques",
  "bien-etre": "Bien-être",
  "sorties-enfants": "Sorties enfants",
  "hebergements": "Hébergements",
  "sante": "Santé",
  "lieux-culturels": "Lieux culturels",
  "sport-nature": "Sport & nature",
};

export const PLACE_CATEGORIES_DESCRIPTIONS: Record<string, string> = {
  "restaurants-cafes": "Les tables qu'on a aimées et qu'on referait.",
  "salons-the": "Pour les pauses douceur entre copines.",
  "boutiques": "Les adresses mode, déco et concept stores qu'on se chuchote.",
  "bien-etre": "Spas, hammams et massages pour souffler un peu.",
  "sorties-enfants": "Les endroits où les petits sont rois.",
  "hebergements": "Les nuits douces qu'on a testées pour toi.",
  "sante": "Médecins femmes, gynécos, sages-femmes et dentistes de confiance.",
  "lieux-culturels": "Musées, galeries et librairies qu'on a adorés.",
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
