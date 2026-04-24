import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/google/places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return NextResponse.json(
      { error: "place_id requis" },
      { status: 400 },
    );
  }

  try {
    const details = await getPlaceDetails(placeId);
    if (!details) {
      return NextResponse.json({ error: "Lieu introuvable" }, { status: 404 });
    }
    return NextResponse.json({ place: details });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
