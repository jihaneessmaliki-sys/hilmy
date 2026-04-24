/**
 * Helpers session pour les Server Components des dashboards.
 * Tous respectent les RLS (pas de bypass service-role côté client/SSR).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  Prestataire,
  UserProfile,
} from "@/lib/supabase/types";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

/** Redirige vers /auth/login si pas de session. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
  return user;
}

/** Redirige vers /onboarding si user_profiles vide (signup incomplet). */
export async function requireUserProfile() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, user_id, prenom, pays, ville, signupType, bio, avatar_url, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/onboarding");
  return { user, profile: data as unknown as UserProfile };
}

/** Redirige vers /onboarding/prestataire si la user n'a pas de fiche (profiles) encore. */
export async function requirePrestataire() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/onboarding/prestataire");
  return { user, prestataire: data as unknown as Prestataire };
}

/** Ne redirige pas — retourne null si absente. Utile pour "si existe déjà, va dashboard". */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("id, user_id, prenom, pays, ville, signupType, bio, avatar_url, created_at")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as UserProfile) ?? null;
}

export async function getPrestataireProfile(
  userId: string,
): Promise<Prestataire | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as Prestataire) ?? null;
}
