import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { areaName, fromOpenMeteo, fromPostOffices, isPin } from "@/lib/places";
import { GET as placesGET } from "@/app/api/places/route";
import { GET as reverseGET } from "@/app/api/reverse/route";
import { GET as geocodeGET } from "@/app/api/geocode/route";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
afterEach(() => vi.unstubAllGlobals());

describe("place helpers", () => {
  it("recognises 6-digit Indian PIN codes only", () => {
    expect(isPin("110024")).toBe(true);
    expect(isPin(" 400001 ")).toBe(true);
    expect(isPin("11002")).toBe(false);
    expect(isPin("Delhi 110024")).toBe(false);
  });

  it("turns geocoder results into labelled suggestions with district and state", () => {
    const [s] = fromOpenMeteo([{ name: "Aurangabad", latitude: 19.88, longitude: 75.34, admin1: "Maharashtra", admin2: "Aurangabad District", country: "India" }]);
    expect(s).toMatchObject({ kind: "place", label: "Aurangabad", sub: "Aurangabad District, Maharashtra, India", lat: 19.88, region: "Maharashtra" });
  });

  it("lists each distinct PIN-code area once, with an address to look up", () => {
    const out = fromPostOffices("110024", [
      { Name: "Lajpat Nagar (South Delhi)", District: "South Delhi", State: "Delhi" },
      { Name: "Lajpat Nagar", District: "South Delhi", State: "Delhi" },
      { Name: "Defence Colony", District: "South Delhi", State: "Delhi" },
    ]);
    expect(out.map((s) => s.label)).toEqual(["Lajpat Nagar", "Defence Colony"]);
    expect(out[0]).toMatchObject({ kind: "pin", sub: "South Delhi, Delhi · 110024", resolve: "Lajpat Nagar, South Delhi, Delhi, India" });
  });

  it("builds a short area name for the current location", () => {
    expect(areaName({ suburb: "Lajpat Nagar", city: "Delhi", state: "Delhi" })).toEqual({ name: "Lajpat Nagar, Delhi", region: "Delhi" });
    expect(areaName({ village: "Khatauli", state_district: "Muzaffarnagar", state: "Uttar Pradesh" })).toEqual({ name: "Khatauli, Muzaffarnagar", region: "Uttar Pradesh" });
  });
});

describe("search APIs", () => {
  it("suggests PIN-code areas from India Post", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      expect(url).toContain("postalpincode.in/pincode/110024");
      return json([{ Status: "Success", PostOffice: [{ Name: "Defence Colony", District: "South Delhi", State: "Delhi" }] }]);
    }));
    const j = await (await placesGET(new NextRequest("http://t/api/places?q=110024"))).json();
    expect(j.suggestions[0]).toMatchObject({ label: "Defence Colony", kind: "pin" });
  });

  it("returns an empty list for an unknown PIN instead of failing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([{ Status: "Error", PostOffice: null }])));
    const j = await (await placesGET(new NextRequest("http://t/api/places?q=999999"))).json();
    expect(j.suggestions).toEqual([]);
  });

  it("ignores one-letter queries", async () => {
    const j = await (await placesGET(new NextRequest("http://t/api/places?q=D"))).json();
    expect(j.suggestions).toEqual([]);
  });

  it("names the current location and rounds coordinates before sending them", async () => {
    const fetchMock = vi.fn(async (_url: string) => json({ address: { suburb: "Lajpat Nagar", city: "Delhi", state: "Delhi" } }));
    vi.stubGlobal("fetch", fetchMock);
    const j = await (await reverseGET(new NextRequest("http://t/api/reverse?lat=28.567712&lon=77.243391"))).json();
    expect(j.name).toBe("Lajpat Nagar, Delhi");
    expect(String(fetchMock.mock.calls[0][0])).toContain("lat=28.568&lon=77.243");
  });

  it("finds exact coordinates for a picked area", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([{ lat: "28.5713", lon: "77.2330", display_name: "Defence Colony, Delhi" }])));
    const j = await (await geocodeGET(new NextRequest("http://t/api/geocode?q=Defence%20Colony,%20South%20Delhi,%20Delhi,%20India"))).json();
    expect(j).toMatchObject({ lat: 28.5713, lon: 77.233 });
  });

  it("reports a clear 404 when an address can't be found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([])));
    const res = await geocodeGET(new NextRequest("http://t/api/geocode?q=Nowhere%20Street"));
    expect(res.status).toBe(404);
  });
});

import { fromPhoton } from "@/lib/places";

describe("maps-style search", () => {
  const feature = (props: Record<string, string>, lat = 28.528, lon = 77.219) => ({ geometry: { coordinates: [lon, lat] as [number, number] }, properties: props });

  it("marks shops and addresses as exact spots and cities as places", () => {
    const out = fromPhoton([
      feature({ name: "Select Citywalk", osm_value: "mall", street: "Press Enclave Marg", district: "Saket", city: "Delhi", state: "Delhi", postcode: "110017" }),
      feature({ name: "Lucknow", osm_value: "city", state: "Uttar Pradesh", country: "India" }, 26.85, 80.95),
    ]);
    expect(out[0]).toMatchObject({ kind: "spot", label: "Select Citywalk", area: "Saket", sub: "Mall · Press Enclave Marg, Saket, Delhi, 110017", lat: 28.528 });
    expect(out[1]).toMatchObject({ kind: "place", label: "Lucknow" });
  });

  it("uses the street address when a place has no name, and skips empty or duplicate results", () => {
    const out = fromPhoton([feature({ housenumber: "12", street: "Lodhi Road", city: "Delhi", osm_value: "house" }), feature({ osm_value: "house" }), feature({ housenumber: "12", street: "Lodhi Road", city: "Delhi", osm_value: "house" })]);
    expect(out.map((s) => s.label)).toEqual(["12 Lodhi Road"]);
  });

  it("ranks results in India first", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      json({ features: [feature({ name: "Connaught", osm_value: "commercial", city: "London", countrycode: "GB" }), feature({ name: "Connaught Place", osm_value: "suburb", city: "New Delhi", countrycode: "IN" })] })
    ));
    const j = await (await placesGET(new NextRequest("http://t/api/places?q=connaught"))).json();
    expect(j.suggestions[0].label).toBe("Connaught Place");
    expect(j.provider).toBe("OpenStreetMap");
  });

  it("uses Google Places when a key is configured", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      json({ suggestions: [{ placePrediction: { placeId: "abc", structuredFormat: { mainText: { text: "Select CITYWALK" }, secondaryText: { text: "Saket, New Delhi, Delhi, India" } } } }] })
    );
    vi.stubGlobal("fetch", fetchMock);
    const j = await (await placesGET(new NextRequest("http://t/api/places?q=select&session=s1"))).json();
    vi.unstubAllEnvs();
    expect(j.provider).toBe("Google");
    expect(j.suggestions[0]).toMatchObject({ placeId: "abc", label: "Select CITYWALK", area: "Saket", kind: "spot" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).sessionToken).toBe("s1");
  });
});
