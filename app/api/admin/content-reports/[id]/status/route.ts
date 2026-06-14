import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/content-reports/[id]/status
 * Met à jour le statut d'un signalement générique `content_reports` (PR-c :
 * photos communauté, target_type='place_photo'). Sert à VIDER la file de
 * modération : 'reviewed' (traité) ou 'dismissed' (rejeté). Ne touche PAS la
 * photo elle-même (le retrait se fait via /api/admin/place-photos/[id]/remove).
 *
 * Body : { status: 'reviewed' | 'dismissed' }
 */
const ALLOWED = new Set(["reviewed", "dismissed"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = typeof body?.status === "string" ? body.status : "";

  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { error: "Statut invalide (reviewed | dismissed)." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_reports")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
