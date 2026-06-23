import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/supabase/session";
import {
  isInstagramConfigured,
  exchangeCodeForToken,
  fetchInstagramImport,
} from "@/lib/instagram/config";

const INSTAGRAM_PAGE = "/onboarding/prestataire/instagram";

/**
 * Callback OAuth Instagram. DORMANT tant que l'app Meta n'est pas validée.
 *
 * Étapes : vérifie le state anti-CSRF → échange le code contre un token →
 * récupère username/bio/photo + 6 posts → stocke le résultat dans un cookie
 * httpOnly court (`ig_import`) pour pré-remplir la preview côté page.
 *
 * TODO (à brancher quand l'app Meta sera live) : transformer cette preview en
 * insert `profiles` (source_import='instagram', status='pending'), sur le même
 * modèle que la voie Google Places (app/onboarding/prestataire/google).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (reason: string) =>
    NextResponse.redirect(`${origin}${INSTAGRAM_PAGE}?error=${reason}`);

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/auth/login?next=${encodeURIComponent(INSTAGRAM_PAGE)}`,
    );
  }
  if (!isInstagramConfigured()) return back("not_configured");

  // Meta renvoie error_reason si la prestataire refuse l'autorisation.
  if (url.searchParams.get("error")) return back("denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("ig_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return back("bad_state");
  }

  const token = await exchangeCodeForToken(code);
  if (!token) return back("token_failed");

  const imported = await fetchInstagramImport(token.access_token);
  if (!imported) return back("fetch_failed");

  // On stocke la preview (pas le token) dans un cookie httpOnly court. Le token
  // n'est jamais persisté : une fois les données lues, il n'est plus utile.
  const res = NextResponse.redirect(`${origin}${INSTAGRAM_PAGE}?connected=1`);
  res.cookies.delete("ig_oauth_state");
  res.cookies.set("ig_import", JSON.stringify(imported), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 min : le temps de relire/valider la preview
  });
  return res;
}
