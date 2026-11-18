import { NextRequest, NextResponse } from "next/server";
import { complete, parseJson, providers } from "@/lib/llm";
import { PLAN_SHAPE, PROMPT_VERSION, SYSTEM, contextText, langRule } from "@/lib/prompt";
import { rulePlan } from "@/lib/rules";
import { describeCorrections, enforceFixed } from "@/lib/enforce";
import { hhmm, hourOf } from "@/lib/aqi";
import { cleanLang, cleanProfile, rateLimited, validAir } from "@/lib/guard";
import type { Plan } from "@/lib/types";

// Same place + same forecast hour + same household + same language → reuse the plan for 15 minutes.
const CACHE_MS = 15 * 60_000;
const cache = new Map<string, { at: number; body: object }>();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !validAir(body.air)) return NextResponse.json({ error: "Missing air data" }, { status: 400 });
  const air = body.air;
  const profile = cleanProfile(body.profile);
  const lang = cleanLang(body.lang);

  if (!providers().length) return NextResponse.json({ plan: rulePlan(air, profile), source: "rules", reason: "no-key" });

  const key = JSON.stringify([PROMPT_VERSION, air.location.lat, air.location.lon, air.current.time, profile, lang]);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json({ ...hit.body, cached: true });

  if (rateLimited(req)) return NextResponse.json({ plan: rulePlan(air, profile), source: "rules", reason: "rate-limited" });

  try {
    const messages = [
      { role: "system" as const, content: `${SYSTEM}\n\n${langRule(lang)}` },
      { role: "user" as const, content: `${contextText(air, profile)}\n\n${PLAN_SHAPE}` },
    ];
    const { text, provider, model } = await complete(messages, true);
    const raw = parseJson<Plan>(text);
    if (!raw.headline || !Array.isArray(raw.schedule)) throw new Error("AI returned an incomplete plan");
    // The model is good at advice but can drift on times; pin the user's fixed commitments ourselves.
    const exposureAt = (time: string) => {
      const v = air.hours.find((h: { time: string }) => hhmm(hourOf(h.time)) === `${time.slice(0, 2)}:00`)?.aqi ?? air.current.aqi;
      return v > 150 ? "high" : v > 100 ? "medium" : "low";
    };
    const plan = enforceFixed({ ...raw, impact: raw.impact ?? [] }, profile.routine, exposureAt);
    // Transparency for users and judges: the exact prompt, the model's raw reply, and what we corrected.
    const trace = { prompt: messages, raw: text, corrections: describeCorrections(raw, plan) };
    const out = { plan, source: provider, model, trace };
    cache.set(key, { at: Date.now(), body: out });
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    return NextResponse.json(out);
  } catch (e) {
    console.error("[plan] AI failed, using rules:", (e as Error).message);
    return NextResponse.json({ plan: rulePlan(air, profile), source: "rules", reason: "ai-error" });
  }
}
