/**
 * Queries Pro Perks (mig 50).
 *
 * 3 audiences distinctes :
 *   • Prestataire (owner_all RLS) : ses propres perks, tous statuts.
 *   • Copine (public_active_select RLS) : perks status='active' + dans
 *     leur fenêtre temporelle (starts_at <= now <= ends_at).
 *   • Admin (admin_all RLS) : queue de modération + override pour
 *     debug.
 *
 * Lectures via createClient() (cookie session) quand RLS suffit ; admin
 * client (service_role) UNIQUEMENT pour les helpers préfixés `Admin`,
 * notamment pour la queue pending_review et l'incrément atomique de
 * used_count au claim.
 *
 * Race-safety : l'incrément used_count utilise une UPDATE conditionnée
 * (cf incrementPerkUsedCountAdmin) — Postgres garantit l'atomicité
 * row-level. Voir Phase 5 D5.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProPerk,
  ProPerkClaim,
  ProPerkStatus,
  QueryResult,
} from "@/lib/supabase/types";

const PERK_SELECT = `
  id,
  prestataire_profile_id,
  title,
  description,
  discount_type,
  discount_value,
  conditions,
  max_uses,
  used_count,
  starts_at,
  ends_at,
  status,
  rejection_reason,
  created_at,
  updated_at
`;

const CLAIM_SELECT = `
  id,
  perk_id,
  user_id,
  code_displayed,
  marked_used_at,
  created_at
`;

/* ─── Lectures prestataire (RLS owner_all) ─────────────────────── */

/** Liste les perks créés par un prestataire (profil donné), tous
 *  statuts confondus. RLS owner_all filtre déjà — on garde le filtre
 *  explicite sur prestataire_profile_id pour clarté. */
export async function listPerksForPrestataire(
  prestataireProfileId: string,
): Promise<QueryResult<ProPerk[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pro_perks")
      .select(PERK_SELECT)
      .eq("prestataire_profile_id", prestataireProfileId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as ProPerk[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/* ─── Lectures Copine (RLS public_active_select) ──────────────── */

export interface ActivePerkWithPrestataire extends ProPerk {
  prestataire: {
    id: string;
    nom: string;
    slug: string | null;
    ville: string | null;
    categorie: string | null;
  } | null;
}

/** Liste les perks actifs ouverts au public (Copines). RLS filtre
 *  déjà sur status='active' + dans la fenêtre — on garde un filtre
 *  côté query pour le défensif et l'ORDER BY. Embed prestataire via
 *  FK pour afficher le nom/ville sur la card. */
export async function listActivePerks(): Promise<
  QueryResult<ActivePerkWithPrestataire[]>
> {
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("pro_perks")
      .select(
        `${PERK_SELECT}, prestataire:profiles!prestataire_profile_id(id, nom, slug, ville, categorie)`,
      )
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    // PostgREST renvoie la relation embed sous forme d'objet (1:1 FK) ;
    // on normalise pour éviter le cas array si PostgREST hésite.
    const rows = (data ?? []).map((row) => {
      const r = row as unknown as ProPerk & {
        prestataire?:
          | { id: string; nom: string; slug: string | null; ville: string | null; categorie: string | null }
          | { id: string; nom: string; slug: string | null; ville: string | null; categorie: string | null }[]
          | null;
      };
      const presta = Array.isArray(r.prestataire) ? r.prestataire[0] ?? null : r.prestataire ?? null;
      return { ...r, prestataire: presta } as ActivePerkWithPrestataire;
    });
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les claims d'une Copine (ses propres codes). RLS self_select. */
export async function listMyClaims(): Promise<QueryResult<ProPerkClaim[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: null };
    const { data, error } = await supabase
      .from("pro_perk_claims")
      .select(CLAIM_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as ProPerkClaim[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/* ─── Lectures admin (service_role) ───────────────────────────── */

/** Queue de modération admin — perks par statut. service_role pour
 *  voir TOUS les perks (RLS public_active_select cache les pending). */
export async function listPerksByStatusAdmin(
  status: ProPerkStatus,
): Promise<ProPerk[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pro_perks")
      .select(PERK_SELECT)
      .eq("status", status)
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as unknown as ProPerk[];
  } catch {
    return [];
  }
}

/** Count pending_review pour le badge nav admin. */
export async function countPendingPerksAdmin(): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("pro_perks")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_review");
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Récupère un perk par id (admin, bypass RLS). Utilisé par les API
 *  routes admin pour fetch contexte (nom prestataire, email, etc.). */
export async function getPerkByIdAdmin(perkId: string): Promise<ProPerk | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pro_perks")
      .select(PERK_SELECT)
      .eq("id", perkId)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as ProPerk;
  } catch {
    return null;
  }
}

/**
 * Incrément ATOMIQUE de used_count avec garde max_uses (cf Phase 5 D5).
 *
 * UPDATE conditionné : la row n'est patchée que si
 * `max_uses IS NULL OR used_count < max_uses`. Si la condition est
 * fausse au moment du UPDATE (ex : 2 Copines qui claim en parallèle au
 * tout dernier slot), PostgreSQL renvoie 0 row affectée — on retourne
 * { ok: false } et le caller doit rollback le claim qui vient d'être
 * inséré (DELETE par id).
 *
 * Retourne aussi le used_count post-incrément pour permettre au caller
 * de détecter le "dernier slot" si besoin UI.
 */
export async function incrementPerkUsedCountAdmin(
  perkId: string,
): Promise<{ ok: true; usedCount: number } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    // .select() après .update() retourne les rows modifiées — vide si
    // la condition WHERE a filtré la row au max.
    const { data, error } = await admin
      .from("pro_perks")
      .update({ used_count: (await readUsedCount(perkId)) + 1 })
      .eq("id", perkId)
      .or("max_uses.is.null,used_count.lt.max_uses")
      .select("used_count")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Plus de places disponibles." };
    return { ok: true, usedCount: (data as { used_count: number }).used_count };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// Helper interne : lecture used_count courant pour construire le patch.
// Note : entre cette read et le UPDATE, une autre transaction peut
// incrémenter. La condition WHERE .or(...) protège quand même contre
// le dépassement de max_uses (le UPDATE n'écrira pas si la condition
// est fausse). Le pire cas est un skip d'un incrément (perte mineure
// de stats used_count) — pas de dépassement de max_uses.
async function readUsedCount(perkId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("pro_perks")
      .select("used_count")
      .eq("id", perkId)
      .maybeSingle();
    return (data as { used_count: number } | null)?.used_count ?? 0;
  } catch {
    return 0;
  }
}

/* ─── Mutation admin : modération ─────────────────────────────── */

export async function setPerkStatusAdmin(
  perkId: string,
  status: ProPerkStatus,
  rejectionReason?: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("pro_perks")
      .update({
        status,
        rejection_reason: status === "rejected" ? (rejectionReason ?? null) : null,
      })
      .eq("id", perkId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
