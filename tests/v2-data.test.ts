import { afterEach, describe, expect, it, vi } from "vitest";
import { dominantPollutant } from "@/lib/pollutants";
import { compass, fetchWeather, weatherEffect } from "@/lib/weather";
import { GET as citiesGET } from "@/app/api/cities/route";
import { INDIA_CITIES } from "@/lib/cities";
import { makeAir } from "./fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("dominantPollutant", () => {
  it("picks the pollutant furthest above its WHO guideline", () => {
    const d = dominantPollutant(makeAir().current); // PM2.5 85 → 5.7× ; NO2 80 → 3.2×
    expect(d?.label).toBe("PM2.5");
    expect(d?.times).toBeCloseTo(85 / 15);
  });

  it("skips missing readings and returns null when there are none", () => {
    const c = { ...makeAir().current, pm25: null, pm10: null, no2: null, o3: null, so2: null, co: null };
    expect(dominantPollutant(c)).toBeNull();
  });
});

describe("weather", () => {
  const w = { time: "", tempC: 17, humidity: 67, windKmh: 3, windDir: 270, precipMm: 0, cloud: 0 };
  it("explains how wind and rain affect smog", () => {
    expect(weatherEffect(w)).toMatch(/still air/i);
    expect(weatherEffect({ ...w, windKmh: 20 })).toMatch(/disperse/i);
    expect(weatherEffect({ ...w, precipMm: 2 })).toMatch(/rain/i);
    expect(weatherEffect(null)).toBe("");
  });

  it("converts wind degrees to a compass point", () => {
    expect(compass(270)).toBe("W");
    expect(compass(44)).toBe("NE");
    expect(compass(null)).toBe("");
  });

  it("returns null instead of failing when the weather service is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    await expect(fetchWeather(28.6, 77.2)).resolves.toBeNull();
  });
});

describe("GET /api/cities", () => {
  it("maps one multi-location response back onto the right cities", async () => {
    const body = INDIA_CITIES.map((_, i) => ({ current: { us_aqi: 100 + i, pm2_5: 50, time: "2026-11-18T00:00" } }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
    const j = await (await citiesGET()).json();
    expect(j.cities).toHaveLength(15);
    expect(j.cities[0]).toMatchObject({ name: "New Delhi", aqi: 100 });
    expect(j.cities[14]).toMatchObject({ name: "Kochi", aqi: 114 });
    expect(j.scale).toBe("US AQI");
  });

  it("marks a city with no reading as null rather than inventing one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(INDIA_CITIES.map(() => ({ current: {} }))), { status: 200 })));
    const j = await (await citiesGET()).json();
    expect(j.cities.every((c: { aqi: number | null }) => c.aqi === null)).toBe(true);
  });

  it("returns 502 when the provider fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { status: 500 })));
    expect((await citiesGET()).status).toBe(502);
  });
});

import { NextRequest } from "next/server";
import { WORLD_CITIES, flag } from "@/lib/cities";

describe("world cities", () => {
  it("returns India plus ~100 world cities, fetched in batches", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const n = new URL(url).searchParams.get("latitude")!.split(",").length;
      return new Response(JSON.stringify(Array.from({ length: n }, () => ({ current: { us_aqi: 50, pm2_5: 10, time: "t" } }))), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const j = await (await citiesGET(new NextRequest("http://t/api/cities?scope=world"))).json();
    expect(j.cities).toHaveLength(INDIA_CITIES.length + WORLD_CITIES.length);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1); // batched
    expect(j.cities.find((c: { name: string }) => c.name === "London")).toMatchObject({ cc: "GB", aqi: 50 });
  });

  it("has a valid country code and real coordinates for every city", () => {
    for (const c of [...INDIA_CITIES, ...WORLD_CITIES]) {
      expect(c.cc).toMatch(/^[A-Z]{2}$/);
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
    }
    expect(flag("IN")).toBe("🇮🇳");
  });
});
