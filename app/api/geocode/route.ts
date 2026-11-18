import { NextRequest, NextResponse } from "next/server";
import { nominatim } from "@/lib/nominatim";
import { googlePlaceDetails, hasGooglePlaces } from "@/lib/googlePlaces";

// Exact coordinates for a picked suggestion: a Google place id, or an address (PIN-code areas).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const placeId = sp.get("placeId");
  if (placeId) {
    if (!hasGooglePlaces()) return NextResponse.json({ error: "Google Places is not configured" }, { status: 400 });
    try {
      return NextResponse.json(await googlePlaceDetails(placeId.slice(0, 300), (sp.get("session") || "").slice(0, 64)));
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }
  const q = (sp.get("q") || "").trim().slice(0, 160);
  if (q.length < 3) return NextResponse.json({ error: "Address too short" }, { status: 400 });
  try {
    const hits = await nominatim<{ lat: string; lon: string; display_name: string }[]>("search", { q, limit: "1" });
    if (!hits.length) return NextResponse.json({ error: `Couldn't find "${q}"` }, { status: 404 });
    return NextResponse.json({ lat: Number(hits[0].lat), lon: Number(hits[0].lon), display: hits[0].display_name, exact: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
