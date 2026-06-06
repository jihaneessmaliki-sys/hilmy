/**
 * Queries prestataires (table : profiles).
 * Respecte les RLS (Modèle B) : la visibilité publique est gérée par la
 * policy "public read visible profiles" (status hors
 * suspended/rejected/ghost/draft ET (paywall_exempt OU abonnement actif)).
 * Une fiche payée est donc visible dès le paiement, même en status
 * 'pending' — on ne filtre plus status='approved' côté requête, c'est la
 * RLS qui gate la visibilité. Pas de bypass admin côté client.
 *
 * ⚠️ Privacy is_founder : tous les helpers de ce fichier appliquent
 * `toPublicPrestataire` qui strippe le champ `is_founder` et substitue
 * `palier` par sa valeur effective (cercle_pro pour les founders).
 * Le champ brut `is_founder` ne doit JAMAIS transiter via ces helpers
 * vers un consumer SSR/CSR. Pour le code server-trusted (dashboard owner,
 * API routes), utiliser `requirePrestataire` ou un select dédié.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Prestataire,
  PrestataireCategorie,
  QueryResult,
} from "@/lib/supabase/types";
import { getEffectivePalier } from "@/lib/permissions";

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
  nb_vues,
  palier,
  is_founder
`;

/**
 * Projection publique d'une ligne `profiles` :
 *  - strippe `is_founder` du résultat (donnée business interne, ne doit pas
 *    transiter dans un bundle SSR/CSR public)
 *  - remplace `palier` par sa valeur effective (founder → cercle_pro)
 *
 * Le consumer reçoit un `Prestataire` dont `palier` reflète directement le
 * niveau d'accès appliqué — plus besoin d'appeler getEffectivePalier côté UI.
 */
function toPublicPrestataire(raw: Prestataire & { is_founder?: boolean }): Prestataire {
  const { is_founder, palier, ...rest } = raw;
  return {
    ...rest,
    palier: getEffectivePalier({ palier, is_founder }),
  };
}

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
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .not("user_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) return { data: null, error: error.message };
    const rows = (data ?? []) as unknown as (Prestataire & { is_founder?: boolean })[];
    return { data: rows.map(toPublicPrestataire), error: null };
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
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    const rows = (data ?? []) as unknown as (Prestataire & { is_founder?: boolean })[];
    return { data: rows.map(toPublicPrestataire), error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Champs PUBLICS de la fiche prestataire — visibles sans login.
 * SÉCURITÉ : whatsapp, email, phone_public, prendre_rdv_url sont
 * VOLONTAIREMENT exclus pour ne JAMAIS atterrir dans le HTML anonyme.
 * Socials handles (instagram, facebook, etc.) sont publics par nature.
 */
const PUBLIC_PRESTATAIRE_SELECT = `
  id,
  slug,
  nom,
  categorie,
  ville,
  code_postal,
  description,
  tagline,
  services,
  galerie,
  photos,
  horaires,
  prix_from,
  prix_gamme,
  devise,
  note_moyenne,
  nb_avis,
  palier,
  is_founder,
  instagram,
  facebook,
  tiktok,
  youtube,
  linkedin,
  site_web,
  approved_at
`

export type PublicPrestataire = {
  id: string
  slug: string
  nom: string
  categorie: string
  ville: string | null
  code_postal: string | null
  description: string | null
  tagline: string | null
  services: Array<{ nom: string; prix?: string; duree?: string }> | null
  galerie: string[] | null
  photos: string[] | null
  horaires: Record<string, string> | null
  prix_from: number | null
  prix_gamme: string | null
  devise: string | null
  note_moyenne: number | null
  nb_avis: number | null
  palier: string
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  youtube: string | null
  linkedin: string | null
  site_web: string | null
  approved_at: string | null
}

/**
 * Fetch public d'une fiche prestataire (sans auth requise).
 * Retourne UNIQUEMENT les champs publics — pas de whatsapp/email/phone/rdv_url.
 */
export async function getPublicPrestataire(
  slug: string,
): Promise<QueryResult<PublicPrestataire | null>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select(PUBLIC_PRESTATAIRE_SELECT)
      .eq('slug', slug)
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .maybeSingle()

    if (error) return { data: null, error: error.message }
    if (!data) return { data: null, error: null }

    const raw = data as unknown as PublicPrestataire & { is_founder?: boolean }
    const { is_founder, palier, ...rest } = raw
    return {
      data: {
        ...rest,
        palier: getEffectivePalier({ palier, is_founder }),
      } as PublicPrestataire,
      error: null,
    }
  } catch (err) {
    return { data: null, error: errorMessage(err) }
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
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return {
      data: toPublicPrestataire(data as unknown as Prestataire & { is_founder?: boolean }),
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Récupère la fiche d'une prestataire par slug + user_id, sans filtre de statut.
 * Réservé à la prévisualisation owner-side (fiche en attente ou pausée).
 * Le double filtre slug + user_id garantit qu'on ne lit que sa propre fiche.
 *
 * Note : applique aussi `toPublicPrestataire` car le résultat alimente la
 * même page publique en mode preview — l'owner doit voir sa fiche telle
 * qu'elle apparaîtra publiquement (palier effectif, pas de is_founder).
 */
export async function getPrestataireBySlugForOwner(
  slug: string,
  userId: string
): Promise<QueryResult<Prestataire | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(PRESTATAIRE_SELECT)
      .eq("slug", slug)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };
    return {
      data: toPublicPrestataire(data as unknown as Prestataire & { is_founder?: boolean }),
      error: null,
    };
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
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .eq("categorie", categorie)
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    const rows = (data ?? []) as unknown as (Prestataire & { is_founder?: boolean })[];
    return { data: rows.map(toPublicPrestataire), error: null };
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
      // Modèle B : visibilité gérée par la RLS (plus de filtre status='approved')
      .ilike("ville", ville)
      .order("approved_at", { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: error.message };
    const rows = (data ?? []) as unknown as (Prestataire & { is_founder?: boolean })[];
    return { data: rows.map(toPublicPrestataire), error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
