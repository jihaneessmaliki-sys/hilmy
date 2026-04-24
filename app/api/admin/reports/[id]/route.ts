import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/reports/[id]
 * Body : { action: "remove_reco" | "dismiss" }
 * - remove_reco : marque la reco status='removed' + report status='resolved'
 * - dismiss : report status='dismissed' (pas de changement sur la reco)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: reportId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  if (action !== "remove_reco" && action !== "dismiss") {
    return NextResponse.json(
      { error: "action doit être remove_reco ou dismiss" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("recommendation_reports")
    .select("id, recommendation_id, status")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });
  }

  if (action === "remove_reco") {
    const { error: recoErr } = await admin
      .from("recommendations")
      .update({ status: "removed" })
      .eq("id", report.recommendation_id);
    if (recoErr) {
      return NextResponse.json({ error: recoErr.message }, { status: 400 });
    }
    const { error: repErr } = await admin
      .from("recommendation_reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (repErr) {
      return NextResponse.json({ error: repErr.message }, { status: 400 });
    }
  } else {
    const { error: repErr } = await admin
      .from("recommendation_reports")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (repErr) {
      return NextResponse.json({ error: repErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
