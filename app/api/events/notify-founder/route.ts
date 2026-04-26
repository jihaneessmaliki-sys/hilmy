import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewEventToFounders } from "@/lib/email/transactional";
import { enforceRateLimit } from "@/lib/rate-limit";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://hilmy.io"
  );
}

/**
 * Stage 9 chantier 2A — appelé par /dashboard/utilisatrice/evenements/nouveau
 * juste après l'insert d'un nouvel événement. Envoie une notification email
 * aux founders (FOUNDER_NOTIFICATION_EMAILS) — best-effort.
 *
 * Body attendu : { event_id: string }
 */
export async function POST(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: "events-notify-founder",
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
  const eventId = body?.event_id;
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json(
      { error: "event_id requis" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, slug, start_date, city, user_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return NextResponse.json({ ok: true, skipped: "event not found" });
  }

  // Sécurité : seule l'organisatrice peut déclencher la notif (anti-spam)
  if (event.user_id !== user.id) {
    return NextResponse.json({ error: "Non autorisée" }, { status: 403 });
  }

  const eventUrl = `${getSiteUrl()}/evenement-v2/${event.slug ?? event.id}`;

  try {
    await sendNewEventToFounders({
      eventTitle: event.title,
      eventDate: event.start_date,
      city: event.city,
      organisatriceEmail: user.email ?? null,
      eventUrl,
    });
  } catch (e) {
    console.error("sendNewEventToFounders failed:", e);
    return NextResponse.json(
      { ok: false, error: "Email non envoyé" },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true });
}
