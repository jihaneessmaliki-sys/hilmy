import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recommendations/[id]/report — signale un avis (RGPD/modération).
 * Body : { reason?: string }.
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
  const reason =
    typeof body?.reason === "string" ? body.reason.trim() || null : null;

  const { error } = await supabase.from("recommendation_reports").insert({
    recommendation_id: recoId,
    reporter_id: user.id,
    reason,
    status: "pending",
  });

  // Si déjà signalé (unique violation) — on considère que c'est noté
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
