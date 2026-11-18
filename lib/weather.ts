// Current weather from Open-Meteo. Wind and rain matter for smog: wind disperses it, rain washes it out.
import type { Weather } from "./types";

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);

export async function fetchWeather(lat: number, lon: number): Promise<Weather | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover&timezone=auto`;
  try {
    const r = await fetch(url, { next: { revalidate: 600 } });
    if (!r.ok) return null;
    const c = (await r.json()).current;
    if (!c) return null;
    return {
      time: c.time,
      tempC: num(c.temperature_2m),
      humidity: num(c.relative_humidity_2m),
      windKmh: num(c.wind_speed_10m),
      windDir: num(c.wind_direction_10m),
      precipMm: num(c.precipitation),
      cloud: num(c.cloud_cover),
    };
  } catch {
    return null; // weather is helpful context, never a reason to fail the whole request
  }
}

/** One-line plain-language effect of the weather on smog, used in the UI and the prompt. */
export function weatherEffect(w: Weather | null | undefined): string {
  if (!w) return "";
  if ((w.precipMm ?? 0) >= 0.5) return "Rain is helping wash particles out of the air.";
  if (w.windKmh == null) return "";
  if (w.windKmh < 6) return "Very still air: pollution is building up near the ground.";
  if (w.windKmh < 15) return "Light wind: only slow clearing of pollution.";
  return "Breezy: wind is helping disperse pollution.";
}

const DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const compass = (deg: number | null) => (deg == null ? "" : DIRS[Math.round(deg / 45) % 8]);
