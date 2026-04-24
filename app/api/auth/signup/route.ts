import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFounderSignupNotification, sendSignupEmail } from "@/lib/email/transactional";
import { getRequestOrigin } from "@/lib/auth/redirect-origin";

export const runtime = "nodejs";

type SignupPayload = {
  email?: string;
  password?: string;
  nextPath?: string;
  signupType?: "member" | "provider";
};

function isValidSignupType(value: string | undefined): value is "member" | "provider" {
  return value === "member" || value === "provider";
}

function getBaseUrl(request: Request) {
  return getRequestOrigin(request);
}

function isValidNextPath(value: string | undefined) {
  return !value || (value.startsWith("/") && !value.startsWith("//"));
}

export async function POST(request: Request) {
  let payload: SignupPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const nextPath = payload.nextPath;
  const signupType = payload.signupType ?? "member";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  if (!isValidNextPath(nextPath)) {
    return NextResponse.json({ error: "Redirection invalide." }, { status: 400 });
  }

  if (!isValidSignupType(signupType)) {
    return NextResponse.json({ error: "Type de compte invalide." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const baseUrl = getBaseUrl(request);

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: {
          signupType,
        },
        redirectTo: `${baseUrl}/auth/callback`,
      },
    });

    if (error || !data.properties.hashed_token) {
      if (error?.message.includes("already been registered") || error?.message.includes("already registered")) {
        return NextResponse.json(
          { error: "Ce compte existe déjà. Connecte-toi ou réinitialise ton mot de passe." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Impossible de créer le compte pour l'instant." },
        { status: 500 }
      );
    }

    // Build a direct link to our own callback with the token_hash.
    // This bypasses Supabase's /auth/v1/verify endpoint which can
    // redirect to the site root if the redirect URL is not whitelisted.
    const confirmUrl = `${baseUrl}/auth/callback?token_hash=${data.properties.hashed_token}&type=signup`;

    await sendSignupEmail(email, confirmUrl);

    try {
      await sendFounderSignupNotification({
        email,
        signupType,
        redirectPath: nextPath,
        userId: data.user?.id,
        createdAt: data.user?.created_at,
      });
    } catch (notificationError) {
      console.error("Founder signup notification failed", notificationError);
    }

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
      { error: "Impossible d'envoyer l'email de confirmation pour l'instant." },
      { status: 500 }
    );
  }
}