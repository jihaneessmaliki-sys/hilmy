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

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
