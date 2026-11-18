import { afterEach, describe, expect, it, vi } from "vitest";
import { complete, parseJson, providers } from "@/lib/llm";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: { message } }), { status });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("LLM provider fallback", () => {
  it("has no provider when no key is set", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(providers()).toEqual([]);
  });

  it("falls back to Gemini when OpenAI fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "test-gemini");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("openai.com") ? fail(500, "server error") : ok({ candidates: [{ content: { parts: [{ text: "hello" }] } }] })
      )
    );
    const r = await complete([{ role: "user", content: "hi" }]);
    expect(r).toMatchObject({ text: "hello", provider: "gemini" });
  });

  it("throws when every provider fails, so callers can use the rule-based plan", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn(async () => fail(401, "bad key")));
    await expect(complete([{ role: "user", content: "hi" }])).rejects.toThrow("bad key");
  });
});

describe("parseJson", () => {
  it("accepts JSON wrapped in a markdown code fence", () => {
    expect(parseJson<{ a: number }>('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});
