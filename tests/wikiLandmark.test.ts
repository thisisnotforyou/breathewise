import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isLandmark, pickLandmark, type WikiCandidate } from "@/lib/wikiLandmark";
import { GET as landmarkGET } from "@/app/api/landmark/route";

const cand = (title: string, description: string, length: number, dist = 1000): WikiCandidate => ({ title, description, length, dist, lat: 26.45, lon: 80.33 });

afterEach(() => vi.unstubAllGlobals());

describe("pickLandmark", () => {
  it("keeps landmarks and drops neighbourhoods, stations, schools and companies", () => {
    expect(isLandmark(cand("JK Temple", "Hindu Temple in Uttar Pradesh, India", 1))).toBe(true);
    expect(isLandmark(cand("Chaman Ganj", "Neighbourhood in Kanpur Nagar", 1))).toBe(false);
    expect(isLandmark(cand("Chandari Junction railway station", "Railway station in Uttar Pradesh", 1))).toBe(false);
    expect(isLandmark(cand("BNSD Inter College", "Intermediate college in Kanpur", 1))).toBe(false);
    expect(isLandmark(cand("Noida Supertech Twin Towers", "Tallest structures voluntarily demolished in India", 1))).toBe(false);
  });

  it("prefers the most substantial article", () => {
    const best = pickLandmark([cand("JK Temple", "Hindu temple", 5190), cand("Kanpur Memorial Well", "Bibighar memorial", 25892), cand("Green Park Stadium", "Cricket stadium", 7627)]);
    expect(best?.title).toBe("Kanpur Memorial Well");
  });

  it("returns null when nothing nearby is a landmark", () => {
    expect(pickLandmark([cand("Some Road", "Road in Kanpur", 9000)])).toBeNull();
  });
});

describe("GET /api/landmark", () => {
  it("rejects invalid coordinates", async () => {
    expect((await landmarkGET(new NextRequest("http://t/api/landmark?lat=200&lon=0"))).status).toBe(400);
  });

  it("returns the best nearby landmark with its Hindi name", async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      new Response(
        JSON.stringify({
          query: {
            pages: [
              { title: "JK Temple", description: "Hindu temple", length: 5000, coordinates: [{ lat: 26.47, lon: 80.31, dist: 900 }], langlinks: [{ lang: "hi", title: "जेके मंदिर" }] },
              { title: "Chaman Ganj", description: "Neighbourhood in Kanpur", length: 9000, coordinates: [{ lat: 26.46, lon: 80.34, dist: 400 }] },
            ],
          },
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    const j = await (await landmarkGET(new NextRequest("http://t/api/landmark?lat=26.4499&lon=80.3319"))).json();
    expect(j.landmark).toMatchObject({ name: "JK Temple", hi: "जेके मंदिर", lat: 26.47, lon: 80.31 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // one request per lookup
    expect(String(fetchMock.mock.calls[0][0])).toContain("ggscoord=26.45%7C80.33"); // rounded to ~1 km
  });

  it("degrades to no landmark when Wikipedia is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    const j = await (await landmarkGET(new NextRequest("http://t/api/landmark?lat=26.45&lon=80.33"))).json();
    expect(j.landmark).toBeNull();
  });
});
