import type { AirData, Profile } from "@/lib/types";

/** A Delhi-like winter day: dirty morning, cleaner afternoon (14:00–16:00), bad evening. */
export function makeAir(overrides: Partial<AirData> = {}): AirData {
  const day = "2026-11-18";
  const curve = [190, 188, 185, 182, 180, 182, 185, 178, 170, 160, 140, 120, 105, 96, 90, 92, 110, 150, 175, 185, 190, 192, 194, 195];
  const hours = curve.map((aqi, h) => ({ time: `${day}T${String(h).padStart(2, "0")}:00`, aqi, pm25: aqi / 2 }));
  return {
    location: { name: "Delhi, National Capital Territory of Delhi, India", city: "Delhi", region: "National Capital Territory of Delhi", lat: 28.65, lon: 77.23, timezone: "Asia/Kolkata" },
    current: { time: `${day}T08:00`, aqi: 170, pm25: 85, pm10: 90, no2: 80, o3: 14, co: 1200, so2: 40 },
    hours,
    days: [
      { date: "2026-11-18", min: 90, avg: 160, max: 195 },
      { date: "2026-11-19", min: 80, avg: 140, max: 180 },
      { date: "2026-11-20", min: 120, avg: 210, max: 260 },
    ],
    cleanWindows: hours.filter((h) => ["13", "14", "15"].includes(h.time.slice(11, 13))),
    hotspots: [],
    hotspotSource: "model",
    ...overrides,
  };
}

export const profile = (p: Partial<Profile> = {}): Profile => ({
  members: 4,
  household: ["young children"],
  commute: "Car",
  home: "Apartment near a main road",
  notes: "",
  routine: "",
  ...p,
});
