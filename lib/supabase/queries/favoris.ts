/**
 * Queries favoris (table polymorphique : type_item = prestataire | lieu | evenement).
 * RLS owner-only — auth.uid() est injecté automatiquement par Supabase.
 * Toutes les ops échouent si l'utilisatrice n'est pas connectée.
 */

import { createClient as createClientBrowser } from "@/lib/supabase/client";
import { createClient as createClientServer } from "@/lib/supabase/server";
import type { Favori, FavoriType, QueryResult } from "@/lib/supabase/types";

const FAVORI_SELECT = `id, user_id, type_item, item_id, note_perso, created_at`;

/**
 * Récupère les favoris de l'utilisatrice connectée (tous types confondus).
 * Utilisé côté server (dashboard).
 */
export async function getFavorisForCurrentUser(): Promise<
  QueryResult<Favori[]>
> {
  try {
    const supabase = await createClientServer();
    const { data, error } = await supabase
      .from("favoris")
      .select(FAVORI_SELECT)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as Favori[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Ajoute un favori côté client (depuis un bouton cœur). */
export async function addFavori(
  typeItem: FavoriType,
  itemId: string,
  notePerso?: string
): Promise<QueryResult<Favori>> {
  try {
    const supabase = createClientBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { data: null, error: "Pas connectée" };

    const { data, error } = await supabase
      .from("favoris")
      .insert({
        user_id: userData.user.id,
        type_item: typeItem,
        item_id: itemId,
        note_perso: notePerso ?? null,
      })
      .select(FAVORI_SELECT)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as Favori, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Retire un favori côté client. */
export async function removeFavori(
  typeItem: FavoriType,
  itemId: string
): Promise<QueryResult<true>> {
  try {
    const supabase = createClientBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { data: null, error: "Pas connectée" };

    const { error } = await supabase
      .from("favoris")
      .delete()
      .eq("user_id", userData.user.id)
      .eq("type_item", typeItem)
      .eq("item_id", itemId);

    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Vérifie si un item est en favori (côté client pour l'icône cœur). */
export async function isFavori(
  typeItem: FavoriType,
  itemId: string
): Promise<boolean> {
  try {
    const supabase = createClientBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data } = await supabase
      .from("favoris")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("type_item", typeItem)
      .eq("item_id", itemId)
      .maybeSingle();

    return Boolean(data);
  } catch {
    return false;
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
