import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recommendations/[id]/reply — réponse publique de la prestataire.
 * Body : { reply: string }.
 * Vérifie que auth.uid() est bien l'organisatrice de la fiche (profiles.user_id).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiée" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const reply =
    typeof body?.reply === "string" ? body.reply.trim() : "";
  if (reply.length === 0) {
    return NextResponse.json(
      { error: "La réponse ne peut pas être vide." },
      { status: 400 },
    );
  }
  if (reply.length > 800) {
    return NextResponse.json(
      { error: "Max 800 caractères." },
      { status: 400 },
    );
  }

  // Fetch reco + prestataire pour vérifier ownership
  const { data: reco } = await supabase
    .from("recommendations")
    .select("id, profile_id, profile:profiles(user_id)")
    .eq("id", recoId)
    .maybeSingle();

  if (!reco || !reco.profile_id) {
    return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  }

  const profileUserId = Array.isArray(reco.profile)
    ? (reco.profile[0] as { user_id: string } | undefined)?.user_id
    : (reco.profile as { user_id: string } | null)?.user_id;

  if (profileUserId !== user.id) {
    return NextResponse.json({ error: "Non autorisée" }, { status: 403 });
  }

  const { error: updErr } = await supabase
    .from("recommendations")
    .update({
      reponse_pro: reply,
      reponse_date: new Date().toISOString(),
    })
    .eq("id", recoId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
