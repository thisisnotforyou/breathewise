import { describe, expect, it } from "vitest";
import { band, cleanWindows, dailySummary } from "@/lib/aqi";
import { makeAir } from "./fixtures";

describe("AQI bands", () => {
  it("uses US AQI category boundaries and always has a written label", () => {
    expect(band(50).en).toBe("Good");
    expect(band(51).en).toBe("Moderate");
    expect(band(151).en).toBe("Unhealthy");
    expect(band(301).en).toBe("Hazardous");
    expect(band(null).en).toBe("Good");
    for (const v of [10, 80, 120, 180, 250, 400]) expect(band(v).hi.length).toBeGreaterThan(0);
  });
});

describe("cleanWindows", () => {
  it("picks the three cleanest daytime hours in time order", () => {
    const w = cleanWindows(makeAir().hours);
    expect(w.map((h) => h.time.slice(11, 16))).toEqual(["13:00", "14:00", "15:00"]);
  });

  it("ignores night hours even when they are cleaner", () => {
    const hours = [
      { time: "2026-11-18T02:00", aqi: 10, pm25: 5 },
      { time: "2026-11-18T10:00", aqi: 120, pm25: 60 },
    ];
    expect(cleanWindows(hours).map((h) => h.aqi)).toEqual([120]);
  });

  it("returns nothing when there is no forecast", () => {
    expect(cleanWindows([])).toEqual([]);
  });
});

describe("dailySummary", () => {
  it("summarises full days and skips partial ones", () => {
    const times = Array.from({ length: 30 }, (_, i) => `2026-11-${18 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`);
    const aqi = times.map((_, i) => (i < 24 ? 100 : 50));
    const days = dailySummary(times, aqi);
    expect(days).toEqual([{ date: "2026-11-18", min: 100, avg: 100, max: 100 }]);
  });
});
