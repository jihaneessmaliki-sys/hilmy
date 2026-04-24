import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEventCancelledEmail } from "@/lib/email/transactional";

/**
 * POST /api/events/[id]/cancel — annule (soft delete) un événement.
 * - Vérifie que la user authentifiée est bien l'organisatrice (user_id = auth.uid())
 * - UPDATE events SET status='removed' (RLS protège déjà l'écriture)
 * - Si `notify=true` dans le body : envoie un email aux inscrites
 *
 * Body : { notify?: boolean, raison?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiée" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const notify = body?.notify === true;
  const raison =
    typeof body?.raison === "string" ? body.raison.trim() || null : null;

  // Récupère l'event pour vérifier ownership + obtenir titre/date pour les emails
  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, title, start_date, user_id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) {
    return NextResponse.json(
      { error: evErr?.message ?? "Événement introuvable" },
      { status: 404 },
    );
  }
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Non autorisée" }, { status: 403 });
  }
  if (event.status === "removed") {
    return NextResponse.json({ ok: true, alreadyRemoved: true });
  }

  // Soft delete (RLS "Users can update own events")
  const { error: updErr } = await supabase
    .from("events")
    .update({ status: "removed" })
    .eq("id", eventId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  // Notifications inscrites (best-effort, n'empêche pas le succès du cancel)
  let emailsSent = 0;
  if (notify) {
    const admin = createAdminClient();
    const { data: inscriptions } = await admin
      .from("event_inscriptions")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "inscrite");

    const inscritesIds = (inscriptions ?? []).map((i) => i.user_id);
    if (inscritesIds.length > 0) {
      // Récupère emails + prénoms en bulk
      const { data: profiles } = await admin
        .from("user_profiles")
        .select("user_id, prenom")
        .in("user_id", inscritesIds);
      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.user_id, p.prenom]),
      );

      // Récupère les emails via auth.admin (un par un — pas d'API bulk)
      for (const userId of inscritesIds) {
        try {
          const { data: au } = await admin.auth.admin.getUserById(userId);
          const email = au?.user?.email;
          if (!email) continue;
          await sendEventCancelledEmail({
            to: email,
            prenom: profileMap.get(userId) ?? null,
            eventTitre: event.title,
            eventDate: event.start_date,
            raison,
          });
          emailsSent++;
        } catch (e) {
          console.error(`sendEventCancelledEmail failed for ${userId}:`, e);
        }
      }

      // Marque les inscriptions comme annulées
      await admin
        .from("event_inscriptions")
        .update({ status: "annulee" })
        .eq("event_id", eventId)
        .eq("status", "inscrite");
    }
  }

  return NextResponse.json({ ok: true, emailsSent });
}
