/**
 * Queries inscriptions événements (table : event_inscriptions).
 * RLS : une user voit ses propres inscriptions, l'organisatrice voit toutes
 * celles de SES events. Toutes les ops d'écriture se font côté client avec
 * auth.uid().
 */

import { createClient as createClientBrowser } from "@/lib/supabase/client";
import { createClient as createClientServer } from "@/lib/supabase/server";
import type {
  EventInscription,
  InscriptionStatus,
  QueryResult,
} from "@/lib/supabase/types";

const INSC_SELECT = `id, event_id, user_id, status, created_at, updated_at`;

/**
 * Liste les inscriptions d'un événement (côté server).
 * Utile pour l'organisatrice dans son dashboard.
 */
export async function getInscriptionsForEvent(
  eventId: string
): Promise<QueryResult<EventInscription[]>> {
  try {
    const supabase = await createClientServer();
    const { data, error } = await supabase
      .from("event_inscriptions")
      .select(INSC_SELECT)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []) as unknown as EventInscription[],
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les inscriptions de l'utilisatrice connectée (tous events). */
export async function getInscriptionsForCurrentUser(): Promise<
  QueryResult<EventInscription[]>
> {
  try {
    const supabase = await createClientServer();
    const { data, error } = await supabase
      .from("event_inscriptions")
      .select(INSC_SELECT)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return {
      data: (data ?? []) as unknown as EventInscription[],
      error: null,
    };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Inscrit l'utilisatrice courante à un événement (côté client). */
export async function inscrireToEvent(
  eventId: string
): Promise<QueryResult<EventInscription>> {
  try {
    const supabase = createClientBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { data: null, error: "Pas connectée" };

    const { data, error } = await supabase
      .from("event_inscriptions")
      .insert({
        event_id: eventId,
        user_id: userData.user.id,
        status: "inscrite" as InscriptionStatus,
      })
      .select(INSC_SELECT)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as unknown as EventInscription, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Annule l'inscription de l'utilisatrice courante. */
export async function annulerInscription(
  eventId: string
): Promise<QueryResult<true>> {
  try {
    const supabase = createClientBrowser();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { data: null, error: "Pas connectée" };

    const { error } = await supabase
      .from("event_inscriptions")
      .update({ status: "annulee" as InscriptionStatus })
      .eq("event_id", eventId)
      .eq("user_id", userData.user.id);

    if (error) return { data: null, error: error.message };
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
