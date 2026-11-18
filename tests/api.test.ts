import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as planPOST } from "@/app/api/plan/route";
import { GET as airGET } from "@/app/api/air/route";
import { makeAir, profile } from "./fixtures";

const post = (body: unknown) => new NextRequest("http://test/api/plan", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` } });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/plan", () => {
  it("rejects requests without valid air data", async () => {
    const res = await planPOST(post({ profile: profile() }));
    expect(res.status).toBe(400);
  });

  it("returns a rule-based plan, clearly labelled, when no AI key is configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const j = await (await planPOST(post({ air: makeAir(), profile: profile({ routine: "3 PM school pickup" }) }))).json();
    expect(j).toMatchObject({ source: "rules", reason: "no-key" });
    expect(j.plan.schedule.some((s: { time: string; fixed?: boolean }) => s.time === "15:00" && s.fixed)).toBe(true);
  });

  it("falls back to the rule-based plan when the AI provider fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 })));
    const j = await (await planPOST(post({ air: makeAir({ current: { ...makeAir().current, time: "2026-11-18T09:00" } }), profile: profile() }))).json();
    expect(j).toMatchObject({ source: "rules", reason: "ai-error" });
  });

  it("uses the AI plan and sends the routine to the model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "");
    const aiPlan = { headline: "Go out at 2 PM", summary: "s", schedule: [{ time: "15:00", activity: "school pickup", why: "fixed", exposure: "medium", fixed: true }], family: [], indoor: [], commute: [], swaps: [], impact: [], weekAhead: "", healthWatch: [] };
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(aiPlan) } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const j = await (await planPOST(post({ air: makeAir({ current: { ...makeAir().current, time: "2026-11-18T10:00" } }), profile: profile({ routine: "6 baje tuition hai" }) }))).json();
    expect(j.source).toBe("openai");
    expect(j.plan.headline).toBe("Go out at 2 PM");
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(sent.messages[1].content).toContain("6 baje tuition hai");
    expect(sent.messages[1].content).toContain("NEXT 24 HOURS");
  });
});

describe("GET /api/air", () => {
  it("returns a readable 404 for an unknown place", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [] }), { status: 200 })));
    const res = await airGET(new NextRequest("http://test/api/air?q=Atlantisxyz"));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Couldn't find/);
  });

  it("rejects invalid coordinates", async () => {
    const res = await airGET(new NextRequest("http://test/api/air?lat=500&lon=1"));
    expect(res.status).toBe(400);
  });

  it("reports when the air-quality service is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("down", { status: 503 })));
    const res = await airGET(new NextRequest("http://test/api/air?lat=28.6&lon=77.2"));
    expect(res.status).toBe(502);
  });
});
