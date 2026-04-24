import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set(["published", "flagged", "removed"] as const);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const next = body?.status;

  if (!ALLOWED.has(next)) {
    return NextResponse.json(
      { error: `status doit être un de : ${Array.from(ALLOWED).join(", ")}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("recommendations")
    .update({ status: next })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
