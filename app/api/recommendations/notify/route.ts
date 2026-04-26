import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNouvelAvisRecu } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Appelée par le client juste après avoir inséré une recommendation
 * type='prestataire'. Envoie l'email "nouvel avis reçu" à la prestataire.
 *
 * Body attendu : { recommendation_id: string }
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: "reco-notify",
    max: 10,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiée" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const recoId = body?.recommendation_id;
  if (!recoId || typeof recoId !== "string") {
    return NextResponse.json(
      { error: "recommendation_id requis" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: reco } = await admin
    .from("recommendations")
    .select("id, type, comment, profile_id, user_id")
    .eq("id", recoId)
    .maybeSingle();

  if (!reco || reco.type !== "prestataire" || !reco.profile_id) {
    return NextResponse.json({ ok: true, skipped: "non applicable" });
  }

  // Auteur doit correspondre à la user authentifiée (évite le spoofing)
  if (reco.user_id !== user.id) {
    return NextResponse.json({ error: "Non autorisée" }, { status: 403 });
  }

  const [prestaRes, authorRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, nom, slug, user_id")
      .eq("id", reco.profile_id)
      .maybeSingle(),
    admin
      .from("user_profiles")
      .select("prenom")
      .eq("user_id", reco.user_id)
      .maybeSingle(),
  ]);

  const presta = prestaRes.data;
  if (!presta || !presta.user_id) {
    return NextResponse.json({ ok: true, skipped: "fiche sans user" });
  }

  const { data: au } = await admin.auth.admin.getUserById(presta.user_id);
  const email = au?.user?.email;
  if (!email) {
    return NextResponse.json({ ok: true, skipped: "email introuvable" });
  }

  try {
    await sendNouvelAvisRecu({
      to: email,
      prestaPrenom: presta.nom.split(" ")[0] ?? "toi",
      auteurPrenom: authorRes.data?.prenom ?? "Une copine",
      avisExcerpt: reco.comment,
      ficheSlug: presta.slug,
    });
  } catch (e) {
    console.error("sendNouvelAvisRecu failed:", e);
    return NextResponse.json(
      { ok: false, error: "Email non envoyé" },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true });
}
