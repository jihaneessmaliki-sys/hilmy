import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();

  // Handle email confirmation & password recovery links (token_hash flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery",
    });

    if (!error) {
      // Password recovery → redirect to reset page
      if (type === "recovery") {
        return NextResponse.redirect(
          `${origin}/reinitialiser-mot-de-passe`
        );
      }

      // Email confirmation (signup/email) → check profile & redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          return NextResponse.redirect(`${origin}/prestataires`);
        }
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Handle OAuth / PKCE code exchange flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && next === "/onboarding") {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          return NextResponse.redirect(`${origin}/prestataires`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/inscription`);
}
