import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/place-photos/[id]/report — signale une photo communauté.
 *
 * Signalement RÉSERVÉ aux connectées (décision PR-c) : on insère dans la table
 * générique `content_reports` (target_type='place_photo') via le client SESSION
 * → l'INSERT est gaté Postgres-side par la RLS `user_id = auth.uid()`.
 *
 * La photo RESTE published : un signalement ne masque RIEN. Il alimente la file
 * de modération admin (modération a posteriori), l'admin décide du retrait.
 *
 * Body : { reason?: string }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await params;
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

  const { error } = await supabase.from("content_reports").insert({
    user_id: user.id,
    target_type: "place_photo",
    target_id: photoId,
    reason,
    status: "pending",
  });

  // Doublon (déjà signalé) → on considère que c'est noté.
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
