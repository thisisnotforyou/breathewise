// Which pollutant is furthest above the WHO 2021 air-quality guideline (µg/m³).
// This is a comparison against health guidelines, not a regulatory AQI sub-index.
import type { AirData } from "./types";

export const WHO_GUIDELINE = { pm25: 15, pm10: 45, no2: 25, o3: 100, so2: 40, co: 4000 } as const;
const LABEL = { pm25: "PM2.5", pm10: "PM10", no2: "NO₂", o3: "O₃", so2: "SO₂", co: "CO" } as const;

export type Dominant = { key: keyof typeof WHO_GUIDELINE; label: string; value: number; times: number };

export function dominantPollutant(c: AirData["current"]): Dominant | null {
  let best: Dominant | null = null;
  for (const key of Object.keys(WHO_GUIDELINE) as (keyof typeof WHO_GUIDELINE)[]) {
    const value = c[key];
    if (value == null || !isFinite(value)) continue;
    const times = value / WHO_GUIDELINE[key];
    if (!best || times > best.times) best = { key, label: LABEL[key], value, times };
  }
  return best;
}
