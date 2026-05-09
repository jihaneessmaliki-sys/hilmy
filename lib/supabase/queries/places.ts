/**
 * Queries lieux (table : places).
 * Pas de status/modération sur places — on récupère tout.
 * Le filtrage se fait via recommendations (type='place').
 *
 * PLACE_SELECT inclut depuis mig 41 : palier (default 'aucun'), nb_vues
 * (compteur agrégé bumpé par trigger sur place_views), created_by_user_id
 * (mig 28 — owner concept pour le dashboard owner). Ces 3 colonnes sont
 * optionnelles dans le type Place donc tous les call sites existants
 * compilent sans modif (elles arrivent juste enrichies).
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
  created_by_user_id,
  palier,
  nb_vues,
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

/**
 * Liste les lieux possédés par une utilisatrice (côté dashboard owner lieu,
 * Phase 2A · PR-B2). "Owner" = `places.created_by_user_id` (mig 28) — décision
 * Jiji A1 du brief : pas de système `owner_user_id` séparé pour le MVP.
 *
 * Tri : Sélection Hilmy d'abord (les fiches payantes en haut), puis ordre
 * alphabétique sur `name` pour stabilité visuelle si plusieurs lieux gratuits.
 */
export async function getMyOwnedPlaces(
  userId: string
): Promise<QueryResult<Place[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("places")
      .select(PLACE_SELECT)
      .eq("created_by_user_id", userId)
      .order("palier", { ascending: false }) // 'selection_hilmy' avant 'aucun' (string DESC)
      .order("name", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Place[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Récupère un lieu par id ET ownership. Retourne null silencieusement si
 * le lieu n'existe pas OU si l'utilisatrice n'en est pas owner — la page
 * dashboard détail s'en sert pour rediriger en 403-style sans révéler
 * l'existence d'autres lieux. Pas de service-role : RLS owner-read suffit.
 */
export async function getOwnedPlaceById(
  userId: string,
  placeId: string
): Promise<QueryResult<Place | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("places")
      .select(PLACE_SELECT)
      .eq("id", placeId)
      .eq("created_by_user_id", userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as Place) ?? null, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
