import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/recommendations/[id]/like — toggle like.
 * Renvoie { liked: boolean, count: number }.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: recoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifiée" }, { status: 401 });
  }

  // Toggle : regarde si like existe
  const { data: existing } = await supabase
    .from("recommendation_likes")
    .select("id")
    .eq("recommendation_id", recoId)
    .eq("user_id", user.id)
    .maybeSingle();

  let liked: boolean;
  if (existing) {
    const { error } = await supabase
      .from("recommendation_likes")
      .delete()
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    liked = false;
  } else {
    const { error } = await supabase.from("recommendation_likes").insert({
      recommendation_id: recoId,
      user_id: user.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    liked = true;
  }

  const { count } = await supabase
    .from("recommendation_likes")
    .select("id", { count: "exact", head: true })
    .eq("recommendation_id", recoId);

  return NextResponse.json({ liked, count: count ?? 0 });
}
