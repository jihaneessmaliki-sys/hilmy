import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/google/places";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, {
    tag: "places-search",
    max: 30,
    windowMs: 60 * 1000,
  });
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchPlaces(query);
    return NextResponse.json({ results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ results: [], error: message }, { status: 500 });
  }
}
