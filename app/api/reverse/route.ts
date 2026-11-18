import { NextRequest, NextResponse } from "next/server";
import { nominatim } from "@/lib/nominatim";
import { areaName } from "@/lib/places";

// Names the user's current location ("Lajpat Nagar, Delhi"). Coordinates are rounded to ~100 m first.
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  try {
    const j = await nominatim<{ address?: Record<string, string> }>("reverse", { lat: lat.toFixed(3), lon: lon.toFixed(3), zoom: "14" });
    return NextResponse.json(areaName(j.address));
  } catch (e) {
    return NextResponse.json({ name: "", error: (e as Error).message });
  }
}
