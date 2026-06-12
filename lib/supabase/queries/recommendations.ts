/**
 * Queries recommendations (table polymorphique : type='place' | 'prestataire').
 * Quand type='prestataire' → c'est un AVIS avec rating + reponse_pro possible.
 * Quand type='place' → c'est un TÉMOIGNAGE sur un lieu.
 */

import { createClient } from "@/lib/supabase/server";
import type { Recommendation, QueryResult } from "@/lib/supabase/types";

const RECO_SELECT = `
  id,
  user_id,
  type,
  place_id,
  profile_id,
  comment,
  rating,
  tags,
  price_indicator,
  photo_urls,
  reponse_pro,
  reponse_date,
  status,
  created_at,
  updated_at
`;

/** Toutes les recommandations publiées (plus récentes en premier). */
export async function getAllRecommendations(): Promise<
  QueryResult<Recommendation[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select(RECO_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Recommendation[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Avis d'une prestataire (type='prestataire', status='published'). */
export async function getRecommendationsByPrestataire(
  profileId: string
): Promise<QueryResult<Recommendation[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select(RECO_SELECT)
      .eq("type", "prestataire")
      .eq("profile_id", profileId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Recommendation[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Témoignages d'un lieu (type='place', status='published'). */
export async function getRecommendationsByPlace(
  placeId: string
): Promise<QueryResult<Recommendation[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select(RECO_SELECT)
      .eq("type", "place")
      .eq("place_id", placeId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Recommendation[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Champs PUBLICS d'une reco de lieu — servis depuis la vue SECURITY
 * DEFINER `recos_vitrine_public` (mig 63), seul chemin de lecture anonyme
 * (la table recommendations est en RLS auth-only). Zéro donnée perso :
 * pas de user_id, pas de comment, pas de photo_urls. Voir le comment SQL
 * de la vue.
 */
export type VitrineReco = {
  place_slug: string;
  place_name: string;
  place_city: string | null;
  place_hilmy_category: string | null;
  rating: number | null;
};

type VitrineRecoRow = VitrineReco & {
  is_user_reco: boolean;
  created_at: string;
};

/**
 * Les N lieux distincts les plus récemment recommandés par de VRAIES
 * copines (`is_user_reco=true` → seeds éditoriaux exclus : pas de fausse
 * preuve sociale). Dédoublonné par lieu (un lieu = une carte, la reco la
 * plus récente l'emporte). Projection anonyme-safe. Alimente le bloc
 * « Les copines recommandent » de l'accueil anonyme — la section se
 * masque d'elle-même si la liste est vide.
 */
export async function getRecosVitrine(
  limit = 6
): Promise<QueryResult<VitrineReco[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("recos_vitrine_public")
      .select(
        "place_slug, place_name, place_city, place_hilmy_category, rating, is_user_reco, created_at"
      )
      .eq("is_user_reco", true)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) return { data: null, error: error.message };

    const seen = new Set<string>();
    const deduped: VitrineReco[] = [];
    for (const row of (data ?? []) as unknown as VitrineRecoRow[]) {
      if (seen.has(row.place_slug)) continue;
      seen.add(row.place_slug);
      deduped.push({
        place_slug: row.place_slug,
        place_name: row.place_name,
        place_city: row.place_city,
        place_hilmy_category: row.place_hilmy_category,
        rating: row.rating,
      });
      if (deduped.length >= limit) break;
    }
    return { data: deduped, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
