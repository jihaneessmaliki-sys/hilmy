import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFicheRejetee } from "@/lib/email/transactional";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  if (!notes) {
    return NextResponse.json(
      { error: "Un motif de refus est obligatoire." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: fiche, error: updErr } = await admin
    .from("profiles")
    .update({
      status: "rejected",
      admin_notes: notes,
    })
    .eq("id", id)
    .select("id, nom, user_id")
    .single();

  if (updErr || !fiche) {
    return NextResponse.json(
      { error: updErr?.message ?? "Fiche introuvable" },
      { status: 400 },
    );
  }

  const { data: authUser } = await admin.auth.admin.getUserById(fiche.user_id);
  const email = authUser?.user?.email;
  const { data: profile } = await admin
    .from("user_profiles")
    .select("prenom")
    .eq("user_id", fiche.user_id)
    .maybeSingle();

  if (email) {
    try {
      await sendFicheRejetee({
        to: email,
        prenom: profile?.prenom ?? fiche.nom.split(" ")[0] ?? "toi",
        nomFiche: fiche.nom,
        raisons: notes,
      });
    } catch (e) {
      console.error("sendFicheRejetee failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
