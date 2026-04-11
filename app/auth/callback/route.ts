import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user already has a user_profile — if so, skip onboarding
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
