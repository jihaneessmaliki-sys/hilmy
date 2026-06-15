import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaceContactLive } from "@/lib/google/places";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/places/[id]/contact — téléphone + horaires LIVE d'un lieu.
 *
 * RÉSERVÉ AUX MEMBRES CONNECTÉES (verrou coût + cohérence : anonyme = QUOI,
 * membre = COMMENT). Ordre IMPÉRATIF :
 *   1. session vérifiée → pas de session = 401 AVANT tout appel Google
 *      (aucune fuite de donnée, aucun coût déclenché) ;
 *   2. [id] = UUID INTERNE du lieu → on lit son google_place_id en base (un
 *      membre ne peut donc interroger que de vrais lieux Hilmy, pas un place_id
 *      Google arbitraire) ;
 *   3. appel Google live (field mask minimal phone+horaires, cache perf 6 h).
 *
 * AUCUN stockage : la donnée transite Google → route → client. Rien en base.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Garde-fou anti-abus (compte connecté qui spammerait la route).
  const limited = enforceRateLimit(request, {
    tag: "places-contact",
    max: 30,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  // 1. VERROU session — AVANT tout appel Google.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiée" }, { status: 401 });
  }

  // 2. Résolution google_place_id depuis l'UUID interne (read RLS-safe).
  const { id } = await params;
  const { data: place } = await supabase
    .from("places")
    .select("google_place_id")
    .eq("id", id)
    .maybeSingle();

  const googlePlaceId = (place as { google_place_id: string | null } | null)
    ?.google_place_id;
  if (!googlePlaceId) {
    return NextResponse.json(
      { error: "Lieu sans identifiant Google" },
      { status: 404 },
    );
  }

  // 3. Appel Google live (minimal + caché 6 h).
  try {
    const contact = await getPlaceContactLive(googlePlaceId);
    if (!contact) {
      return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
    }
    return NextResponse.json({ contact });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
