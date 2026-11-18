import { describe, expect, it } from "vitest";
import { cleanLang, cleanProfile, validAir } from "@/lib/guard";
import { makeAir } from "./fixtures";

describe("input validation", () => {
  it("clamps and trims untrusted profile fields", () => {
    const p = cleanProfile({ members: 999, household: Array(50).fill("x".repeat(500)), routine: "a".repeat(5000) } as never);
    expect(p.members).toBe(20);
    expect(p.household).toHaveLength(10);
    expect(p.household[0]).toHaveLength(60);
    expect(p.routine).toHaveLength(600);
  });

  it("defaults missing fields safely", () => {
    expect(cleanProfile(undefined)).toMatchObject({ members: 1, household: [], routine: "" });
    expect(cleanLang("fr")).toBe("en");
  });

  it("rejects malformed air data", () => {
    expect(validAir(makeAir())).toBe(true);
    expect(validAir({ current: { aqi: "high" } })).toBe(false);
    expect(validAir(null)).toBe(false);
  });
});
