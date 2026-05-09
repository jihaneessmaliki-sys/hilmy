/**
 * Queries vidéos prestataires + lieux (mig 43).
 *
 * Public read OK via RLS (`*_public_read TO anon, authenticated`).
 * Owner write OK via RLS (`*_owner_write` qui filtre profile.user_id /
 * places.created_by_user_id).
 *
 * Pour les writes server-side (API routes), on passe par admin client
 * après validation owner manuelle — voir app/api/videos/upload/route.ts.
 */

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  PlaceVideo,
  ProfileVideo,
  QueryResult,
} from "@/lib/supabase/types";

const PROFILE_VIDEO_SELECT = `
  id,
  profile_id,
  storage_path,
  thumbnail_storage_path,
  duration_seconds,
  size_bytes,
  created_at,
  updated_at
`;

const PLACE_VIDEO_SELECT = `
  id,
  place_id,
  storage_path,
  thumbnail_storage_path,
  duration_seconds,
  size_bytes,
  created_at,
  updated_at
`;

/** Liste les vidéos d'un prestataire (server-side, public read). */
export async function getProfileVideos(
  profileId: string,
): Promise<QueryResult<ProfileVideo[]>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("profile_videos")
      .select(PROFILE_VIDEO_SELECT)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as ProfileVideo[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les vidéos d'un lieu (server-side, public read). */
export async function getPlaceVideos(
  placeId: string,
): Promise<QueryResult<PlaceVideo[]>> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("place_videos")
      .select(PLACE_VIDEO_SELECT)
      .eq("place_id", placeId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as PlaceVideo[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Pour un set de profile_id, retourne le sous-ensemble de ceux qui ont
 * au moins une vidéo. Optimisé pour le badge ▶ VIDÉO sur les feed cards
 * de l'annuaire (1 query batch au lieu de N+1).
 */
export async function getProfileIdsWithVideos(
  profileIds: string[],
): Promise<Set<string>> {
  if (profileIds.length === 0) return new Set();
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("profile_videos")
      .select("profile_id")
      .in("profile_id", profileIds);
    return new Set(((data ?? []) as { profile_id: string }[]).map((r) => r.profile_id));
  } catch {
    return new Set();
  }
}

/** Mirror getProfileIdsWithVideos pour les lieux. */
export async function getPlaceIdsWithVideos(
  placeIds: string[],
): Promise<Set<string>> {
  if (placeIds.length === 0) return new Set();
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("place_videos")
      .select("place_id")
      .in("place_id", placeIds);
    return new Set(((data ?? []) as { place_id: string }[]).map((r) => r.place_id));
  } catch {
    return new Set();
  }
}

/**
 * INSERT vidéo après validation owner + palier (à utiliser depuis API
 * route seulement, jamais côté client). Bypass RLS via admin client
 * — on a déjà validé l'ownership en amont.
 */
export async function insertProfileVideoAdmin(input: {
  profile_id: string;
  storage_path: string;
  thumbnail_storage_path: string | null;
  duration_seconds: number;
  size_bytes: number;
}): Promise<QueryResult<ProfileVideo>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profile_videos")
      .insert(input)
      .select(PROFILE_VIDEO_SELECT)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as unknown as ProfileVideo, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

export async function insertPlaceVideoAdmin(input: {
  place_id: string;
  storage_path: string;
  thumbnail_storage_path: string | null;
  duration_seconds: number;
  size_bytes: number;
}): Promise<QueryResult<PlaceVideo>> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("place_videos")
      .insert(input)
      .select(PLACE_VIDEO_SELECT)
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data as unknown as PlaceVideo, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
