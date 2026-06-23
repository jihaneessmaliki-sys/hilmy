import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/supabase/session";
import {
  isInstagramConfigured,
  instagramAuthorizeUrl,
} from "@/lib/instagram/config";

const INSTAGRAM_PAGE = "/onboarding/prestataire/instagram";

/**
 * Démarre le flux OAuth Instagram (voie officielle). DORMANT : si l'app Meta
 * n'est pas branchée, on renvoie la prestataire vers la page d'onboarding avec
 * un message "non configuré" — aucune erreur dure.
 *
 * On exige une session : l'import sert à pré-remplir SA fiche prestataire.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  // Pas connectée → login, puis retour ici.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/auth/login?next=${encodeURIComponent(INSTAGRAM_PAGE)}`,
    );
  }

  // App Meta pas encore validée / clés absentes → feature OFF.
  if (!isInstagramConfigured()) {
    return NextResponse.redirect(`${origin}${INSTAGRAM_PAGE}?error=not_configured`);
  }

  // Anti-CSRF : state aléatoire posé en cookie httpOnly, revérifié au callback.
  const state = randomUUID();
  const res = NextResponse.redirect(instagramAuthorizeUrl(state));
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 min : le temps de l'autorisation
  });
  return res;
}
