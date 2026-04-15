import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type ResendConfirmationPayload = {
  email?: string;
  nextPath?: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getRedirectTo(request: Request, nextPath?: string) {
  const url = new URL("/auth/callback", request.url);

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

function isValidNextPath(value: string | undefined) {
  return !value || (value.startsWith("/") && !value.startsWith("//"));
}

function createPublicAuthClient() {
  return createClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request: Request) {
  let payload: ResendConfirmationPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase();
  const nextPath = payload.nextPath;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  if (!isValidNextPath(nextPath)) {
    return NextResponse.json({ error: "Redirection invalide." }, { status: 400 });
  }

  try {
    const supabase = createPublicAuthClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: getRedirectTo(request, nextPath),
      },
    });

    if (error) {
      if (error.message.includes("rate limit")) {
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";

    if (message.includes("Missing environment variable")) {
      return NextResponse.json(
        { error: "Configuration auth incomplète côté serveur." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Impossible de renvoyer l'email de confirmation pour l'instant." },
      { status: 500 }
    );
  }
}