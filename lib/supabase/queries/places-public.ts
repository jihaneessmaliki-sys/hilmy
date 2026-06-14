/**
 * Queries PUBLIQUES de la fiche reco (PR1 — ouverture anonyme).
 *
 * Lisent UNIQUEMENT les vues anon-safe `place_public_detail` et
 * `place_public_recos` (mig 64), jamais les tables `places` /
 * `recommendations` / `user_profiles`. Les vues tournent en SECURITY DEFINER
 * et n'exposent AUCUNE colonne identitaire → impossible de réidentifier une
 * autrice (cf. verrou n°3 de l'architecture).
 *
 * Client serveur ANON (createClient cookie SSR sans session) : le grant anon
 * sur les vues suffit. AUCUN service-role.
 */

import { createClient } from "@/lib/supabase/server";

export type PublicPlaceDetail = {
  place_slug: string;
  name: string;
  hilmy_category: string | null;
  google_category: string | null;
  city: string;
  country: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  main_photo_url: string | null;
  photos: string[] | null;
  palier: 'aucun' | 'selection_hilmy' | null;
  google_place_id: string | null;
  avg_rating: number | null;
  nb_avis: number;
  nb_copines: number;
  price_mode: string | null;
};

export type PublicPlaceReco = {
  reco_id: string;
  place_slug: string;
  comment: string | null;
  rating: number | null;
  tags: string[] | null;
  price_indicator: string | null;
  created_at: string;
};

/**
 * Photo communauté publique. AUCUN champ identitaire (pas de user_id, prenom,
 * recommendation_id) — la vue place_public_photos ne les expose pas. photo_id
 * sert de clé React + cible du signalement (id de ligne photo, non-perso).
 */
export type PublicPlacePhoto = {
  photo_id: string;
  url: string;
  created_at: string;
};

type PublicPlacePhotoRow = {
  photo_id: string;
  storage_path: string;
  created_at: string;
};

const PHOTO_SELECT = "photo_id, storage_path, created_at";

const DETAIL_SELECT =
  "place_slug, name, hilmy_category, google_category, city, country, address, latitude, longitude, description, main_photo_url, photos, palier, google_place_id, avg_rating, nb_avis, nb_copines, price_mode";

const RECO_SELECT =
  "reco_id, place_slug, comment, rating, tags, price_indicator, created_at";

/** Détail public d'un lieu par slug. null si le lieu n'a aucune reco publiée. */
export async function getPublicPlaceDetail(
  slug: string
): Promise<PublicPlaceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_public_detail")
    .select(DETAIL_SELECT)
    .eq("place_slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as PublicPlaceDetail;
}

/** Commentaires publics anonymisés d'un lieu (plus récents en premier). */
export async function getPublicPlaceRecos(
  slug: string
): Promise<PublicPlaceReco[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_public_recos")
    .select(RECO_SELECT)
    .eq("place_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as PublicPlaceReco[];
}

/**
 * Photos PUBLIQUES de la communauté pour un lieu (galerie agrégée, plus
 * récentes d'abord). Lit UNIQUEMENT la vue anon-safe `place_public_photos`
 * (status='published', source `place_user_photos` — JAMAIS l'array legacy
 * `recommendations.photo_urls`). L'URL publique est calculée CÔTÉ SERVEUR
 * depuis le storage_path → rendu SSR indexable, aucune identité exposée.
 */
export async function getPublicPlacePhotos(
  slug: string
): Promise<PublicPlacePhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_public_photos")
    .select(PHOTO_SELECT)
    .eq("place_slug", slug)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as PublicPlacePhotoRow[]).map((r) => ({
    photo_id: r.photo_id,
    created_at: r.created_at,
    url: supabase.storage
      .from("recommendation-photos")
      .getPublicUrl(r.storage_path).data.publicUrl,
  }));
}

/** Lieux similaires (même catégorie), pour le maillage interne SEO. */
export async function getPublicSimilar(
  hilmyCategory: string | null,
  excludeSlug: string,
  limit = 3
): Promise<PublicPlaceDetail[]> {
  if (!hilmyCategory) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_public_detail")
    .select(DETAIL_SELECT)
    .eq("hilmy_category", hilmyCategory)
    .neq("place_slug", excludeSlug)
    .limit(limit);
  if (error || !data) return [];
  return data as unknown as PublicPlaceDetail[];
}
