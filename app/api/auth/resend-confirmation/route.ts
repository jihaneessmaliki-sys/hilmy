import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSignupEmail } from "@/lib/email/transactional";
import { getRequestOrigin } from "@/lib/auth/redirect-origin";

export const runtime = "nodejs";

type ResendConfirmationPayload = {
  email?: string;
};

function getBaseUrl(request: Request) {
  return getRequestOrigin(request);
}

export async function POST(request: Request) {
  let payload: ResendConfirmationPayload;

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

    // Generate a new signup confirmation link via admin API.
    // Using magiclink type to resend a confirmation for an existing user.
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${getBaseUrl(request)}/auth/callback`,
      },
    });

    if (error || !data.properties.hashed_token) {
      if (error?.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Tu viens déjà de demander un email. Attends quelques minutes avant de réessayer." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Impossible de renvoyer l'email pour l'instant." },
        { status: 500 }
      );
    }

    // Build a direct link to our own callback with the token_hash.
    // This bypasses Supabase's /auth/v1/verify endpoint.
    const baseUrl = getBaseUrl(request);
    const confirmUrl = `${baseUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`;

    await sendSignupEmail(email, confirmUrl);

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
      { error: "Impossible de renvoyer l'email de confirmation pour l'instant." },
      { status: 500 }
    );
  }
}
