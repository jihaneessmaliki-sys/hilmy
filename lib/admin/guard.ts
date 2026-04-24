import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Non authentifiée" }, { status: 401 }),
      user: null,
    };
  }
  if (!user.user_metadata?.is_admin) {
    return {
      error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
      user: null,
    };
  }
  return { error: null, user };
}
