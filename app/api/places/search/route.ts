import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.photos,places.addressComponents",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "fr",
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const places = data.places ?? [];

    const results = places.slice(0, 5).map((p: Record<string, unknown>) => {
      const addressComponents = p.addressComponents as Array<{ types: string[]; longText: string }> | undefined;
      let city = "";
      let country = "";
      let region = "";

      if (addressComponents) {
        for (const comp of addressComponents) {
          if (comp.types?.includes("locality")) city = comp.longText;
          if (comp.types?.includes("country")) country = comp.longText;
          if (comp.types?.includes("administrative_area_level_1")) region = comp.longText;
        }
      }

      const location = p.location as { latitude: number; longitude: number } | undefined;
      const displayName = p.displayName as { text: string } | undefined;

      return {
        google_place_id: p.id,
        name: displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        city,
        region,
        country,
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        google_category: p.primaryType ?? null,
      };
    });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
