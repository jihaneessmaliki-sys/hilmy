import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPasswordResetEmail } from "@/lib/email/transactional";

export const runtime = "nodejs";

type PasswordResetPayload = {
  email?: string;
};

function getRedirectTo(request: Request) {
  // Force le domaine hilmy.io en production
  const baseUrl = process.env.NODE_ENV === "production"
    ? "https://hilmy.io"
    : (new URL(request.url)).origin;
  return `${baseUrl}/auth/callback`;
}

export async function POST(request: Request) {
  let payload: PasswordResetPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: getRedirectTo(request),
      },
    });

    if (error || !data.properties.hashed_token) {
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email pour l'instant." },
        { status: 500 }
      );
    }

    // Build a direct link to our own callback with the token_hash.
    // This avoids going through Supabase's /auth/v1/verify endpoint,
    // which can fail with otp_expired and redirect to the site root with a hash error.
    const baseUrl = getRedirectTo(request).replace(/\/auth\/callback$/, "");
    const resetUrl = `${baseUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=recovery`;

    await sendPasswordResetEmail(email, resetUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";

    if (message.includes("Missing environment variable")) {
      return NextResponse.json(
        { error: "Configuration email incomplète côté serveur." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Impossible d'envoyer l'email de réinitialisation pour l'instant." },
      { status: 500 }
    );
  }
}