/**
 * Queries lieux (table : places).
 * Pas de status/modération sur places — on récupère tout.
 * Le filtrage se fait via recommendations (type='place').
 */

import { createClient } from "@/lib/supabase/server";
import type { Place, PlaceCategorie, QueryResult } from "@/lib/supabase/types";

const PLACE_SELECT = `
  id,
  google_place_id,
  name,
  slug,
  description,
  address,
  city,
  region,
  country,
  latitude,
  longitude,
  google_category,
  hilmy_category,
  main_photo_url,
  photos,
  created_at,
  updated_at
`;

/** Liste tous les lieux. */
export async function getAllPlaces(): Promise<QueryResult<Place[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("places")
      .select(PLACE_SELECT)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Place[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Récupère un lieu par son slug (ou son id, fallback). */
export async function getPlaceBySlug(
  slug: string
): Promise<QueryResult<Place | null>> {
  try {
    const supabase = await createClient();
    // Priorité au slug, fallback sur id (uuid)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug
    );
    const query = supabase.from("places").select(PLACE_SELECT);
    const { data, error } = isUuid
      ? await query.eq("id", slug).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as Place) ?? null, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les lieux d'une catégorie HILMY. */
export async function getPlacesByCategorie(
  categorie: PlaceCategorie
): Promise<QueryResult<Place[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("places")
      .select(PLACE_SELECT)
      .eq("hilmy_category", categorie)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Place[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
