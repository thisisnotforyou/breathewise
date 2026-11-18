import { NextRequest, NextResponse } from "next/server";
import { cleanWindows, dailySummary } from "@/lib/aqi";
import type { AirData, Hotspot } from "@/lib/types";
import { fetchWeather } from "@/lib/weather";

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

async function getJson(url: string) {
  const r = await fetch(url, { next: { revalidate: 600 } });
  if (!r.ok) throw new Error(`Upstream ${r.status}`);
  return r.json();
}

async function geocode(q: string) {
  const j = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(q)}`);
  const p = j.results?.[0];
  if (!p) return null;
  return { lat: p.latitude as number, lon: p.longitude as number, city: p.name as string, region: p.admin1 as string | undefined, name: [p.name, p.admin1, p.country].filter(Boolean).join(", ") };
}

/** Real monitoring stations from WAQI, when a token is configured. */
async function stationHotspots(lat: number, lon: number): Promise<Hotspot[]> {
  const token = process.env.WAQI_TOKEN;
  if (!token) return [];
  const d = 0.35;
  const j = await getJson(`https://api.waqi.info/map/bounds?latlng=${lat - d},${lon - d},${lat + d},${lon + d}&token=${token}`);
  if (j.status !== "ok") return [];
  return (j.data as { lat: number; lon: number; aqi: string; station?: { name?: string } }[])
    .map((s) => ({ lat: s.lat, lon: s.lon, aqi: Number(s.aqi), name: s.station?.name }))
    .filter((s) => isFinite(s.aqi))
    .slice(0, 60);
}

/** Fallback: a 5x5 grid of CAMS model cells around the location. */
async function modelHotspots(lat: number, lon: number): Promise<Hotspot[]> {
  const step = 0.2;
  const pts: [number, number][] = [];
  for (let i = -2; i <= 2; i++) for (let k = -2; k <= 2; k++) pts.push([+(lat + i * step).toFixed(3), +(lon + k * step).toFixed(3)]);
  const j = await getJson(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${pts.map((p) => p[0]).join(",")}&longitude=${pts.map((p) => p[1]).join(",")}&current=us_aqi`
  );
  const arr = Array.isArray(j) ? j : [j];
  return arr
    .map((r: { current?: { us_aqi?: number } }, i: number) => ({ lat: pts[i][0], lon: pts[i][1], aqi: num(r.current?.us_aqi) }))
    .filter((h): h is Hotspot => h.aqi != null);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    let loc: { lat: number; lon: number; name: string; city: string; region?: string; exact?: boolean } | null;
    const q = sp.get("q")?.trim();
    if (q) {
      if (q.length > 100) return NextResponse.json({ error: "Location name too long" }, { status: 400 });
      loc = await geocode(q);
      if (!loc) return NextResponse.json({ error: `Couldn't find "${q}"` }, { status: 404 });
    } else {
      const lat = Number(sp.get("lat")), lon = Number(sp.get("lon"));
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
        return NextResponse.json({ error: "Give a city name or coordinates" }, { status: 400 });
      const name = sp.get("name")?.slice(0, 100) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      const region = sp.get("region")?.slice(0, 80) || undefined;
      loc = { lat, lon, name, city: name.split(",")[0].trim(), region, exact: sp.get("exact") === "1" };
    }

    const weatherP = fetchWeather(loc.lat, loc.lon);
    const aq = await getJson(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}` +
        `&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide` +
        `&hourly=us_aqi,pm2_5&forecast_days=7&timezone=auto`
    );
    const c = aq.current;
    if (!c || num(c.us_aqi) == null) return NextResponse.json({ error: "No air-quality data for this place" }, { status: 502 });

    const times: string[] = aq.hourly.time;
    const nowIdx = Math.max(0, times.findIndex((t) => t >= c.time.slice(0, 13)));
    const allHours = times.map((t, i) => ({ time: t, aqi: num(aq.hourly.us_aqi[i]), pm25: num(aq.hourly.pm2_5[i]) }));
    const hours = allHours.slice(nowIdx, nowIdx + 24);

    let hotspots: Hotspot[] = [];
    let hotspotSource: AirData["hotspotSource"] = "model";
    try {
      hotspots = await stationHotspots(loc.lat, loc.lon);
      if (hotspots.length >= 3) hotspotSource = "stations";
      else hotspots = await modelHotspots(loc.lat, loc.lon);
    } catch {
      hotspots = [];
    }

    const data: AirData = {
      location: { ...loc, timezone: aq.timezone },
      current: {
        time: c.time,
        aqi: Math.round(c.us_aqi),
        pm25: num(c.pm2_5),
        pm10: num(c.pm10),
        no2: num(c.nitrogen_dioxide),
        o3: num(c.ozone),
        co: num(c.carbon_monoxide),
        so2: num(c.sulphur_dioxide),
      },
      hours,
      days: dailySummary(times, aq.hourly.us_aqi),
      cleanWindows: cleanWindows(hours),
      hotspots,
      hotspotSource,
      weather: await weatherP,
    };
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "Air-quality service unavailable: " + (e as Error).message }, { status: 502 });
  }
}
