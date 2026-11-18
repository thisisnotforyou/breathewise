import { NextRequest, NextResponse } from "next/server";
import { INDIA_CITIES, WORLD_CITIES, type City } from "@/lib/cities";

export type CityReading = City & { aqi: number | null; pm25: number | null; time: string | null };

// Live US AQI for the globe markers. ?scope=world adds ~100 major cities worldwide.
// Open-Meteo takes many coordinates per request; we send them in batches and cache for 10 minutes.
const BATCH = 60;

async function readings(list: City[]): Promise<CityReading[]> {
  const out: CityReading[] = [];
  const batches = Array.from({ length: Math.ceil(list.length / BATCH) }, (_, i) => list.slice(i * BATCH, (i + 1) * BATCH));
  const results = await Promise.all(
    batches.map(async (b) => {
      const lat = b.map((c) => c.lat).join(",");
      const lon = b.map((c) => c.lon).join(",");
      const r = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&timezone=auto`, { next: { revalidate: 600 } });
      if (!r.ok) throw new Error(`Upstream ${r.status}`);
      const j = await r.json();
      return { b, arr: Array.isArray(j) ? j : [j] };
    })
  );
  for (const { b, arr } of results)
    b.forEach((c, i) =>
      out.push({
        ...c,
        aqi: typeof arr[i]?.current?.us_aqi === "number" ? Math.round(arr[i].current.us_aqi) : null,
        pm25: typeof arr[i]?.current?.pm2_5 === "number" ? arr[i].current.pm2_5 : null,
        time: arr[i]?.current?.time ?? null,
      })
    );
  return out;
}

export async function GET(req?: NextRequest) {
  const world = req?.nextUrl?.searchParams.get("scope") === "world";
  try {
    const cities = await readings(world ? [...INDIA_CITIES, ...WORLD_CITIES] : INDIA_CITIES);
    return NextResponse.json({ cities, source: "Open-Meteo (Copernicus CAMS model)", scale: "US AQI" });
  } catch (e) {
    return NextResponse.json({ error: "City readings unavailable: " + (e as Error).message }, { status: 502 });
  }
}
