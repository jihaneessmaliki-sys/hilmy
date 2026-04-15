import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";

  const cookieStore = await cookies();

  // Collect cookies so we can apply them to the redirect response
  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Store for later + set on cookieStore for subsequent reads (e.g. getUser)
            pendingCookies.push({ name, value, options });
            try {
              cookieStore.set(name, value, options);
            } catch {
              // ignore
            }
          });
        },
      },
    }
  );

  let redirectPath = "/connexion";

  // Handle email confirmation & password recovery links (token_hash flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "email" | "recovery" | "magiclink",
    });

    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error.message, { type, token_hash: token_hash.slice(0, 8) + "..." });
      redirectPath = "/connexion?error=link-expired";
    } else {
      if (type === "recovery") {
        redirectPath = "/reinitialiser-mot-de-passe";
      } else {
        // Email confirmation → check if user has a profile
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // On cherche d'abord dans user_profiles
          let signupType = null;
          let profile = await supabase
            .from("user_profiles")
            .select("id, signupType")
            .eq("user_id", user.id)
            .single();

          if (!profile.data) {
            // Si pas trouvé, on tente dans profiles (prestataire)
            profile = await supabase
              .from("profiles")
              .select("id, signupType")
              .eq("user_id", user.id)
              .single();
          }

          signupType = profile.data?.signupType;

          if (signupType === "provider") {
            redirectPath = "/mon-profil-prestataire";
          } else if (signupType === "member") {
            redirectPath = "/mon-compte";
          } else {
            // fallback
            redirectPath = "/onboarding";
          }
        } else {
          redirectPath = "/onboarding";
        }
      }
    }
  }

  // Handle OAuth / PKCE code exchange flow
  if (!token_hash && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && next === "/onboarding") {
        // On cherche d'abord dans user_profiles
        let signupType = null;
        let profile = await supabase
          .from("user_profiles")
          .select("id, signupType")
          .eq("user_id", user.id)
          .single();

        if (!profile.data) {
          // Si pas trouvé, on tente dans profiles (prestataire)
          profile = await supabase
            .from("profiles")
            .select("id, signupType")
            .eq("user_id", user.id)
            .single();
        }

        signupType = profile.data?.signupType;

        if (signupType === "provider") {
          redirectPath = "/mon-profil-prestataire";
        } else if (signupType === "member") {
          redirectPath = "/mon-compte";
        } else {
          redirectPath = next;
        }
      } else {
        redirectPath = next;
      }
    }
  }

  // Create redirect response and apply ALL session cookies to it
  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Record<string, string>);
  });

  return response;
}
