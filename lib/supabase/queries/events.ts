/**
 * Queries événements (table : events).
 * Respecte les RLS : status='published' pour les anon ; status='published'
 * + visibility='members_only' visibles des authenticated ; owner voit
 * tout. Côté public pour l'instant on tape uniquement le cas published+public.
 */

import { createClient } from "@/lib/supabase/server";
import type { HilmyEvent, QueryResult } from "@/lib/supabase/types";

const EVENT_SELECT = `
  id,
  user_id,
  prestataire_id,
  title,
  slug,
  description,
  event_type,
  format,
  visibility,
  start_date,
  end_date,
  country,
  region,
  city,
  address,
  online_link,
  flyer_url,
  external_signup_url,
  price_type,
  price_amount,
  price_currency,
  places_max,
  inscrites_count,
  status,
  registration_mode,
  created_at,
  updated_at
`;

/** Liste tous les événements publiés (public), triés par date à venir. */
export async function getAllEvents(): Promise<QueryResult<HilmyEvent[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .order("start_date", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as HilmyEvent[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste uniquement les événements à venir. */
export async function getUpcomingEvents(): Promise<QueryResult<HilmyEvent[]>> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gte("start_date", now)
      .order("start_date", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as HilmyEvent[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Récupère un événement par son slug (ou id fallback). */
export async function getEventBySlug(
  slug: string
): Promise<QueryResult<HilmyEvent | null>> {
  try {
    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slug
    );
    const query = supabase.from("events").select(EVENT_SELECT);
    const { data, error } = isUuid
      ? await query.eq("id", slug).maybeSingle()
      : await query.eq("slug", slug).maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: (data as unknown as HilmyEvent) ?? null, error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

/** Liste les événements d'une ville. */
export async function getEventsByVille(
  ville: string
): Promise<QueryResult<HilmyEvent[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .ilike("city", ville)
      .order("start_date", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as unknown as HilmyEvent[], error: null };
  } catch (err) {
    return { data: null, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
