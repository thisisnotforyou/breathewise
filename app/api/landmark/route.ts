import { NextRequest, NextResponse } from "next/server";
import { pickLandmark, type WikiCandidate } from "@/lib/wikiLandmark";

// Finds the most notable landmark near any place with ONE request to Wikipedia's public API
// (nearby articles + their descriptions, sizes, coordinates and Hindi titles).
// Coordinates are rounded to ~1 km before leaving the server; responses are cached for a day.
const API = "https://en.wikipedia.org/w/api.php?";
const HEADERS = { "User-Agent": "BreatheWise/1.0 (air-quality demo app)" };

type Page = { title: string; description?: string; length?: number; coordinates?: { lat: number; lon: number; dist?: number }[]; langlinks?: { lang: string; title: string }[] };

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  const coord = `${lat.toFixed(2)}|${lon.toFixed(2)}`;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "geosearch",
    ggscoord: coord,
    ggsradius: "10000",
    ggslimit: "50",
    prop: "description|info|coordinates|langlinks",
    colimit: "max",
    codistancefrompoint: coord,
    lllang: "hi",
    lllimit: "max",
  });
  try {
    const r = await fetch(API + params, { headers: HEADERS, next: { revalidate: 86_400 } });
    if (!r.ok) throw new Error(`Wikipedia ${r.status}`);
    const pages: Page[] = (await r.json()).query?.pages ?? [];
    const candidates: WikiCandidate[] = pages
      .filter((p) => p.coordinates?.[0])
      .map((p) => ({ title: p.title, description: p.description ?? "", length: p.length ?? 0, lat: p.coordinates![0].lat, lon: p.coordinates![0].lon, dist: p.coordinates![0].dist ?? 5000, hi: p.langlinks?.[0]?.title }));
    const best = pickLandmark(candidates);
    if (!best) return NextResponse.json({ landmark: null });
    return NextResponse.json({ landmark: { name: best.title, hi: best.hi || best.title, lat: best.lat, lon: best.lon, description: best.description, source: "Wikipedia" } });
  } catch (e) {
    return NextResponse.json({ landmark: null, error: (e as Error).message });
  }
}
