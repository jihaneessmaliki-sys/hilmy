/**
 * Queries Voix Hilmy.
 *
 * Source : vues SECURITY DEFINER `voix_hilmy_public` (migration 26)
 * et `voix_hilmy_recos_public` (migration 27) + table
 * `voix_hilmy_follows` (migration 25, RLS strict own-only).
 *
 * Les vues exposent les données publiques (prenom, slug, bio,
 * counters, recos joints place/profile). Pour l'état "is following",
 * on lit voix_hilmy_follows en tant que follower (RLS s'applique →
 * seules nos propres lignes sont visibles).
 */

import { createClient } from "@/lib/supabase/server";
import type {
  QueryResult,
  VoixPublic,
  VoixPublicReco,
} from "@/lib/supabase/types";

const VOIX_SELECT = `
  user_id,
  prenom,
  slug,
  bio,
  activated_at,
  recos_count,
  followers_count
`;

const RECO_SELECT = `
  id,
  voix_user_id,
  type,
  comment,
  created_at,
  place_id,
  place_name,
  place_city,
  place_slug,
  profile_id,
  profile_nom,
  profile_ville,
  profile_slug
`;

/**
 * Récupère une Voix par son slug. La vue filtre déjà
 * is_voix_hilmy = true AND slug IS NOT NULL → si pas de match, la
 * Voix n'existe pas (ou a été désactivée).
 */
export async function getVoixBySlug(
  slug: string,
): Promise<QueryResult<VoixPublic | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voix_hilmy_public")
      .select(VOIX_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as VoixPublic) ?? null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * "Est-ce que la copine connectée suit déjà cette Voix ?"
 * Retourne false si pas connectée. RLS sur voix_hilmy_follows garantit
 * qu'on ne lit que nos propres lignes.
 */
export async function isFollowingVoix(
  voixUserId: string,
): Promise<QueryResult<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: false, error: null };

    const { count, error } = await supabase
      .from("voix_hilmy_follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_user_id", user.id)
      .eq("voix_user_id", voixUserId);

    if (error) return { data: null, error: error.message };
    return { data: (count ?? 0) > 0, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Recos publiées par une Voix (vue voix_hilmy_recos_public, mig 27).
 *
 * Filtre côté client : skip les rows où la cible (place ou profile)
 * a été retournée NULL par le LEFT JOIN — soit place_id n'existe
 * plus, soit profile.status != 'approved'. Le compteur recos_count
 * de voix_hilmy_public peut donc être > au length de cette liste si
 * de tels orphelins existent (acceptable Phase 1, à monitorer).
 */
export async function getRecosByVoix(
  voixUserId: string,
): Promise<QueryResult<VoixPublicReco[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voix_hilmy_recos_public")
      .select(RECO_SELECT)
      .eq("voix_user_id", voixUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { data: null, error: error.message };

    const rows = ((data ?? []) as unknown as VoixPublicReco[]).filter(
      (r) => isRecoRenderable(r),
    );
    return { data: rows, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Une reco est rendable si la cible jointe a au moins son nom.
 * Skip silencieusement les orphelins (LEFT JOIN sans match côté
 * place ou profile non-approved).
 */
function isRecoRenderable(r: VoixPublicReco): boolean {
  if (r.type === "place") return Boolean(r.place_id && r.place_name);
  return Boolean(r.profile_id && r.profile_nom);
}
