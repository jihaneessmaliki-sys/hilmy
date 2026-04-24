import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendConfirmationInscriptionEvent,
  sendNouvelleInscriptionEvent,
} from "@/lib/email/transactional";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://hilmy.io"
  );
}

/**
 * POST — inscrire la user connectée à l'événement.
 * - Vérifie que l'event est published et qu'il reste de la place (si places_max).
 * - Crée/update event_inscriptions (status='inscrite').
 * - Envoie email confirmation à la user ET notification à l'organisatrice.
 */
export async function POST(
  _request: Request,
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

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select(
      "id, title, slug, start_date, city, address, status, visibility, places_max, inscrites_count, prestataire_id, user_id",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) {
    return NextResponse.json(
      { error: evErr?.message ?? "Événement introuvable" },
      { status: 404 },
    );
  }

  if (event.status !== "published") {
    return NextResponse.json(
      { error: "Cet événement n'est pas ouvert aux inscriptions." },
      { status: 400 },
    );
  }

  if (event.places_max && event.inscrites_count >= event.places_max) {
    return NextResponse.json(
      { error: "L'événement est complet." },
      { status: 400 },
    );
  }

  // Upsert inscription (unique sur user+event)
  const { error: insErr } = await supabase.from("event_inscriptions").upsert(
    {
      event_id: eventId,
      user_id: user.id,
      status: "inscrite",
    },
    { onConflict: "event_id,user_id" },
  );

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  // Envoi emails — best-effort (failure ne doit pas bloquer l'inscription)
  const admin = createAdminClient();
  const eventUrl = `${getSiteUrl()}/evenement-v2/${event.slug ?? event.id}`;

  const { data: userProfile } = await admin
    .from("user_profiles")
    .select("prenom")
    .eq("user_id", user.id)
    .maybeSingle();
  const inscritePrenom = userProfile?.prenom ?? "Une copine";

  // Confirmation à la user
  if (user.email) {
    try {
      await sendConfirmationInscriptionEvent({
        to: user.email,
        prenom: userProfile?.prenom,
        eventTitre: event.title,
        eventDate: event.start_date,
        eventVille: event.city,
        eventAdresse: event.address,
        eventUrl,
      });
    } catch (e) {
      console.error("sendConfirmationInscriptionEvent failed:", e);
    }
  }

  // Notification à l'organisatrice (si lien prestataire)
  if (event.prestataire_id || event.user_id) {
    const organisatriceUserId = event.prestataire_id
      ? null
      : event.user_id;

    let organisatriceEmail: string | null = null;
    let organisatricePrenom = "toi";

    if (event.prestataire_id) {
      const { data: presta } = await admin
        .from("profiles")
        .select("nom, user_id")
        .eq("id", event.prestataire_id)
        .maybeSingle();
      if (presta?.user_id) {
        organisatricePrenom = presta.nom.split(" ")[0] ?? "toi";
        const { data: au } = await admin.auth.admin.getUserById(presta.user_id);
        organisatriceEmail = au?.user?.email ?? null;
      }
    } else if (organisatriceUserId) {
      const { data: up } = await admin
        .from("user_profiles")
        .select("prenom")
        .eq("user_id", organisatriceUserId)
        .maybeSingle();
      if (up?.prenom) organisatricePrenom = up.prenom;
      const { data: au } = await admin.auth.admin.getUserById(
        organisatriceUserId,
      );
      organisatriceEmail = au?.user?.email ?? null;
    }

    if (organisatriceEmail && organisatriceEmail !== user.email) {
      try {
        await sendNouvelleInscriptionEvent({
          to: organisatriceEmail,
          prestaPrenom: organisatricePrenom,
          eventTitre: event.title,
          inscritePrenom,
          eventDate: event.start_date,
        });
      } catch (e) {
        console.error("sendNouvelleInscriptionEvent failed:", e);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE — annuler l'inscription.
 */
export async function DELETE(
  _request: Request,
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
  const { error } = await supabase
    .from("event_inscriptions")
    .update({ status: "annulee" })
    .eq("event_id", eventId)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
