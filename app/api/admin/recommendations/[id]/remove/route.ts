import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/recommendations/[id]/remove
 * Retrait admin d'une recommandation avec motif obligatoire (min 10 chars).
 * Soft delete : status='removed' + admin_notes=<motif>.
 *
 * Body : { motif: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: recoId } = await params;
  const body = await request.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() : "";

  if (motif.length < 10) {
    return NextResponse.json(
      { error: "Le motif de retrait est obligatoire (10 caractères minimum)." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("recommendations")
    .update({
      status: "removed",
      admin_notes: motif,
    })
    .eq("id", recoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Si la reco était signalée, marquer les reports comme resolved
  await admin
    .from("recommendation_reports")
    .update({
      status: "resolved",
      admin_notes: motif,
      resolved_at: new Date().toISOString(),
    })
    .eq("recommendation_id", recoId)
    .eq("status", "pending");

  return NextResponse.json({ ok: true });
}
