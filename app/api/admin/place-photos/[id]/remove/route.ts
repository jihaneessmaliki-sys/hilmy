import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/place-photos/[id]/remove
 * Retrait admin d'une photo de lieu avec motif obligatoire (min 10 chars).
 * Soft delete : status='removed' + moderation_motif=<motif> (admin-only).
 * On ne supprime PAS le fichier storage (réversible ; PR-c ne lira que les
 * lignes status='published').
 *
 * Body : { motif: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
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
    .from("place_user_photos")
    .update({
      status: "removed",
      moderation_motif: motif,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
