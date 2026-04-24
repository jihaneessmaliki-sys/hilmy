import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEventCancelledEmail } from "@/lib/email/transactional";

/**
 * POST /api/admin/events/[id]/remove
 * Retrait admin d'un événement avec motif obligatoire (min 10 chars).
 * - Soft delete : events.status='removed' + admin_notes=<motif>
 * - Si inscrites > 0 : email annulation (source='admin') + inscriptions.status='annulee'
 *
 * Body : { motif: string }
 * Réponse : { ok: true, emailsSent: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id: eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() : "";

  if (motif.length < 10) {
    return NextResponse.json(
      { error: "Le motif de retrait est obligatoire (10 caractères minimum)." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: event, error: fetchErr } = await admin
    .from("events")
    .select("id, title, start_date, status")
    .eq("id", eventId)
    .maybeSingle();

  if (fetchErr || !event) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Événement introuvable" },
      { status: 404 },
    );
  }
  if (event.status === "removed") {
    return NextResponse.json({ ok: true, alreadyRemoved: true, emailsSent: 0 });
  }

  // Soft delete
  const { error: updErr } = await admin
    .from("events")
    .update({
      status: "removed",
      admin_notes: motif,
    })
    .eq("id", eventId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }

  // Notifications inscrites
  let emailsSent = 0;
  const { data: inscriptions } = await admin
    .from("event_inscriptions")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "inscrite");

  const inscritesIds = (inscriptions ?? []).map((i) => i.user_id);
  if (inscritesIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_profiles")
      .select("user_id, prenom")
      .in("user_id", inscritesIds);
    const prenomByUserId = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.prenom]),
    );

    for (const userId of inscritesIds) {
      try {
        const { data: au } = await admin.auth.admin.getUserById(userId);
        const email = au?.user?.email;
        if (!email) continue;
        await sendEventCancelledEmail({
          to: email,
          prenom: prenomByUserId.get(userId) ?? null,
          eventTitre: event.title,
          eventDate: event.start_date,
          raison: motif,
          source: "admin",
        });
        emailsSent++;
      } catch (e) {
        console.error(`sendEventCancelledEmail (admin) failed for ${userId}:`, e);
      }
    }

    // Mark inscriptions as annulées
    await admin
      .from("event_inscriptions")
      .update({ status: "annulee" })
      .eq("event_id", eventId)
      .eq("status", "inscrite");
  }

  return NextResponse.json({ ok: true, emailsSent });
}
