/**
 * Queries auto-boost saisonnier prestataires (mig 44 PR-D Sprint 4).
 *
 * Tables : seasonal_event_windows + profile_seasonal_boosts (M:N)
 * Fonctions SQL : is_profile_seasonally_boosted, get_profile_active_seasonal_window
 *
 * RLS appliquée :
 *  - seasonal_event_windows  : public read, admin write
 *  - profile_seasonal_boosts : public read, owner write, admin all
 *
 * Le cap palier (Standard 0 / Premium 1 / Cercle Pro illimité) est revalidé
 * server-side dans setProfileSeasonalBoosts via API route — pas de trigger
 * BDD pour rester souple sur les downgrades de palier.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  ActiveSeasonalBoost,
  ProfileSeasonalBoost,
  QueryResult,
  SeasonalEventWindow,
} from "@/lib/supabase/types";

const WINDOW_SELECT = `
  id,
  slug,
  label,
  emoji,
  starts_at,
  ends_at,
  is_active,
  created_at,
  updated_at
`;

/** Liste toutes les fenêtres calendrier. activeOnly filtre is_active=true. */
export async function listSeasonalWindows(
  activeOnly = false
): Promise<QueryResult<SeasonalEventWindow[]>> {
  try {
    const supabase = await createClient();
    const query = supabase
      .from("seasonal_event_windows")
      .select(WINDOW_SELECT)
      .order("starts_at", { ascending: true, nullsFirst: false });
    const { data, error } = activeOnly
      ? await query.eq("is_active", true)
      : await query;

    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []) as unknown as SeasonalEventWindow[],
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Récupère les boosts actuels d'un prestataire avec le détail des windows. */
export async function getProfileSeasonalBoosts(
  profileId: string
): Promise<QueryResult<(ProfileSeasonalBoost & { window: SeasonalEventWindow })[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profile_seasonal_boosts")
      .select(`id, profile_id, window_id, created_at, window:seasonal_event_windows(${WINDOW_SELECT})`)
      .eq("profile_id", profileId);

    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []) as unknown as (ProfileSeasonalBoost & {
        window: SeasonalEventWindow;
      })[],
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Retourne le label+emoji de la fenêtre active actuelle d'un profile, ou null.
 * Wrap de la fonction SQL get_profile_active_seasonal_window — inclut le filtre
 * palier server-side (premium/cercle_pro/founder uniquement).
 */
export async function getActiveSeasonalLabel(
  profileId: string
): Promise<QueryResult<ActiveSeasonalBoost | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("get_profile_active_seasonal_window", { p_profile_id: profileId });

    if (error) return { data: null, error: error.message };
    const row = (data ?? [])[0] as
      | { window_label: string; window_emoji: string }
      | undefined;
    if (!row) return { data: null, error: null };
    return {
      data: { label: row.window_label, emoji: row.window_emoji },
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/**
 * Batch fetch des labels+emojis actifs pour plusieurs profiles d'un coup.
 * Utilisé par /annuaire pour pré-fetch sans N+1 RPC. Côté SQL on aurait pu
 * faire une fonction set-returning, mais ici on lit les rows boost directement
 * et on joint window dans la query — la fonction RPC retourne 1 row max
 * par profile, mais en cas de plusieurs boosts actifs simultanément (Ramadan
 * + Saison mariage), on prend le 1er par starts_at ASC, comme la fonction SQL.
 */
export async function getActiveSeasonalLabelsBatch(
  profileIds: string[]
): Promise<Map<string, ActiveSeasonalBoost>> {
  if (profileIds.length === 0) return new Map();
  try {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("profile_seasonal_boosts")
      .select(
        `profile_id, profiles!inner(id, palier, is_founder), window:seasonal_event_windows!inner(id, label, emoji, starts_at, ends_at, is_active)`
      )
      .in("profile_id", profileIds)
      .eq("seasonal_event_windows.is_active", true)
      .lte("seasonal_event_windows.starts_at", nowIso)
      .gte("seasonal_event_windows.ends_at", nowIso);

    if (error || !data) return new Map();

    type Row = {
      profile_id: string;
      profiles: { palier: string | null; is_founder: boolean | null };
      window: {
        label: string;
        emoji: string;
        starts_at: string | null;
      };
    };

    // 1 profile peut avoir N boosts actifs simultanément → on garde le 1er
    // par starts_at ASC pour matcher la logique de get_profile_active_seasonal_window.
    const byProfile = new Map<string, Row>();
    for (const r of data as unknown as Row[]) {
      const effPalier = r.profiles.is_founder ? "cercle_pro" : (r.profiles.palier ?? "standard");
      if (effPalier !== "premium" && effPalier !== "cercle_pro") continue;
      const existing = byProfile.get(r.profile_id);
      if (!existing) {
        byProfile.set(r.profile_id, r);
      } else {
        const a = r.window.starts_at ?? "";
        const b = existing.window.starts_at ?? "";
        if (a < b) byProfile.set(r.profile_id, r);
      }
    }

    const out = new Map<string, ActiveSeasonalBoost>();
    for (const [pid, row] of byProfile) {
      out.set(pid, { label: row.window.label, emoji: row.window.emoji });
    }
    return out;
  } catch {
    return new Map();
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
