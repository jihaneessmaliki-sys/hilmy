import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protected routes — require auth
  const protectedPaths = [
    "/prestataires",
    "/prestataire/",
    "/bonnes-adresses",
    "/lieu/",
    "/recommander",
    "/proposer-un-evenement",
    "/mon-compte",
    "/mon-profil-prestataire",
    "/onboarding",
    "/admin",
  ];
  // /evenements and /evenement/[id] are PUBLIC (SEO + discovery)

  const isProtected = protectedPaths.some((p) => path.startsWith(p));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/inscription";
    return NextResponse.redirect(url);
  }

  // If user is logged in and hits /onboarding, check if they already have a user_profile
  // (this is handled client-side in the onboarding page itself)

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
