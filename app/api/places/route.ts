import { NextRequest, NextResponse } from "next/server";
import { fromOpenMeteo, fromPhoton, fromPostOffices, isPin } from "@/lib/places";
import { googleAutocomplete, hasGooglePlaces } from "@/lib/googlePlaces";

// Search suggestions while typing, like a maps search box:
// - 6-digit Indian PIN code → its localities (India Post)
// - anything else → Google Places if configured, otherwise Photon (OpenStreetMap: addresses, shops,
//   malls, colonies, cities), falling back to Open-Meteo city search.
// Optional ?lat&lon bias results towards the user's current area.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  const lat = Number(sp.get("lat")), lon = Number(sp.get("lon"));
  const bias = isFinite(lat) && isFinite(lon) && sp.has("lat") ? { lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) } : undefined;
  try {
    if (isPin(q)) {
      const r = await fetch(`https://api.postalpincode.in/pincode/${q.trim()}`, { next: { revalidate: 86_400 } });
      const j = await r.json();
      const offices = j?.[0]?.Status === "Success" ? j[0].PostOffice : [];
      return NextResponse.json({ suggestions: fromPostOffices(q.trim(), offices), provider: "India Post" });
    }
    if (hasGooglePlaces()) {
      try {
        return NextResponse.json({ suggestions: await googleAutocomplete(q, (sp.get("session") || "").slice(0, 64), bias), provider: "Google" });
      } catch (e) {
        console.error("[places] Google failed, using OpenStreetMap:", (e as Error).message);
      }
    }
    const center = bias ?? { lat: 22.5, lon: 79 }; // default bias: India
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15&lang=en&lat=${center.lat}&lon=${center.lon}`, {
      headers: { "User-Agent": "BreatheWise/1.0 (air-quality demo app)" },
      next: { revalidate: 86_400 },
    });
    if (!r.ok) throw new Error(`Photon ${r.status}`);
    // Rank results in the user's country (India by default) first, keeping Photon's order otherwise.
    const home = sp.get("cc")?.toUpperCase() || "IN";
    const features = ((await r.json()).features ?? []) as { properties: { countrycode?: string } }[];
    const ranked = [...features.filter((f) => f.properties.countrycode === home), ...features.filter((f) => f.properties.countrycode !== home)];
    const suggestions = fromPhoton(ranked as Parameters<typeof fromPhoton>[0]);
    if (suggestions.length) return NextResponse.json({ suggestions, provider: "OpenStreetMap" });
    throw new Error("no results");
  } catch {
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=7&language=en&name=${encodeURIComponent(q)}`, { next: { revalidate: 86_400 } });
      return NextResponse.json({ suggestions: fromOpenMeteo((await r.json()).results), provider: "Open-Meteo" });
    } catch {
      return NextResponse.json({ suggestions: [], error: "Search is unavailable right now" });
    }
  }
}
