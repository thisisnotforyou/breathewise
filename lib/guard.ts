// Light input validation and a per-IP rate limit so a public deployment can't drain the AI key.
import type { NextRequest } from "next/server";
import type { AirData, Lang, Profile } from "./types";

const hits = new Map<string, number[]>();

export function rateLimited(req: NextRequest, limit = 20, windowMs = 10 * 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > limit;
}

const clip = (s: unknown, n: number) => String(s ?? "").slice(0, n);

export function cleanProfile(p: Partial<Profile> | undefined): Profile {
  return {
    members: Math.min(20, Math.max(1, Number(p?.members) || 1)),
    household: Array.isArray(p?.household) ? p!.household.slice(0, 10).map((h) => clip(h, 60)) : [],
    commute: clip(p?.commute, 40),
    home: clip(p?.home, 60),
    notes: clip(p?.notes, 400),
    routine: clip(p?.routine, 600),
  };
}

export const cleanLang = (l: unknown): Lang => (l === "hi" ? "hi" : "en");

export function validAir(a: unknown): a is AirData {
  const x = a as AirData;
  return !!x && typeof x.current?.aqi === "number" && Array.isArray(x.hours) && Array.isArray(x.days) && typeof x.location?.name === "string";
}
