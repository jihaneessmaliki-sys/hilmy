import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFicheApprouvee } from "@/lib/email/transactional";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const admin = createAdminClient();

  // Update fiche
  const { data: fiche, error: updErr } = await admin
    .from("profiles")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      admin_notes: null,
    })
    .eq("id", id)
    .select("id, nom, slug, user_id")
    .single();

  if (updErr || !fiche) {
    return NextResponse.json(
      { error: updErr?.message ?? "Fiche introuvable" },
      { status: 400 },
    );
  }

  // Get email + prenom
  const { data: authUser } = await admin.auth.admin.getUserById(fiche.user_id);
  const email = authUser?.user?.email;
  const { data: profile } = await admin
    .from("user_profiles")
    .select("prenom")
    .eq("user_id", fiche.user_id)
    .maybeSingle();

  if (email) {
    try {
      await sendFicheApprouvee({
        to: email,
        prenom: profile?.prenom ?? fiche.nom.split(" ")[0] ?? "toi",
        nomFiche: fiche.nom,
        ficheSlug: fiche.slug,
      });
    } catch (e) {
      console.error("sendFicheApprouvee failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
