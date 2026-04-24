/**
 * Queries prestataires (table : profiles).
 * Respecte les RLS : seules les fiches status='approved' sont visibles
 * publiquement. Pas de bypass admin côté client.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Prestataire,
  PrestataireCategorie,
  QueryResult,
} from "@/lib/supabase/types";

// ⚠️ On ne sélectionne que les colonnes qui existent vraiment dans la DB.
// Les champs pays/region/code_postal/zone_intervention du type TS Prestataire
// sont absents de la table `profiles` actuelle — ils resteront undefined
// côté consumer (ALTER à ajouter via une future migration si besoin).
const PRESTATAIRE_SELECT = `
  id,
  user_id,
  created_at,
  updated_at,
  nom,
  slug,
  categorie,
  ville,
  description,
  tagline,
  whatsapp,
  instagram,
  tiktok,
  email,
  site_web,
  linkedin,
  services,
  galerie,
  photos,
  prix_from,
  prix_gamme,
  devise,
  status,
  admin_notes,
  approved_at,
  source_import,
  note_moyenne,
  nb_avis,
  nb_vues
`;

/**
 * Les N premières vraies inscrites (prestataires réelles, pas les seeds
 * éditoriaux). Triées par created_at ASC (la + ancienne = pionnière 01).
 * Utilisée par la section "Elles ont ouvert le carnet" de la home publique.
 */
export async function getPionnieres(
  limit = 3,
): Promise<QueryResult<Prestataire[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("status", "approved")
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Prestataire[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste toutes les prestataires approuvées, triées par plus récentes approuvées. */
export async function getAllPrestataires(): Promise<QueryResult<Prestataire[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("status", "approved")
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Prestataire[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Récupère une prestataire par son slug. Renvoie null si introuvable. */
export async function getPrestataireBySlug(
  slug: string
): Promise<QueryResult<Prestataire | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as Prestataire) ?? null, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les prestataires d'une catégorie donnée (approuvées uniquement). */
export async function getPrestatairesByCategorie(
  categorie: PrestataireCategorie
): Promise<QueryResult<Prestataire[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("status", "approved")
      .eq("categorie", categorie)
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Prestataire[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les prestataires d'une ville (approuvées uniquement). */
export async function getPrestatairesByVille(
  ville: string
): Promise<QueryResult<Prestataire[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("status", "approved")
      .ilike("ville", ville)
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Prestataire[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
