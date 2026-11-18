import { describe, expect, it } from "vitest";
import { rulePlan } from "@/lib/rules";
import { makeAir, profile } from "./fixtures";

describe("rule-based fallback plan", () => {
  it("keeps fixed commitments at their exact time and marks them", () => {
    const plan = rulePlan(makeAir(), profile({ routine: "3 PM school pickup, grocery errand" }));
    const pickup = plan.schedule.find((s) => s.activity === "school pickup");
    expect(pickup).toMatchObject({ time: "15:00", fixed: true });
  });

  it("moves flexible tasks into the cleanest forecast hours", () => {
    const plan = rulePlan(makeAir(), profile({ routine: "grocery errand" }));
    expect(plan.schedule.find((s) => s.activity === "grocery errand")?.time).toBe("13:00");
  });

  it("changes when the routine changes, without moving earlier fixed times", () => {
    const air = makeAir();
    const before = rulePlan(air, profile({ routine: "3 PM school pickup" }));
    const after = rulePlan(air, profile({ routine: "3 PM school pickup, 6 baje tuition hai" }));
    expect(before.schedule.some((s) => s.activity === "tuition")).toBe(false);
    expect(after.schedule.find((s) => s.activity === "tuition")).toMatchObject({ time: "18:00", fixed: true });
    expect(after.schedule.find((s) => s.activity === "school pickup")?.time).toBe("15:00");
  });

  it("warns about fixed commitments in high-AQI hours", () => {
    const plan = rulePlan(makeAir(), profile({ routine: "8 PM badminton" }));
    expect(plan.schedule.find((s) => s.activity === "badminton")?.why).toMatch(/N95/);
  });

  it("explains impact using real forecast numbers only", () => {
    const plan = rulePlan(makeAir(), profile({ routine: "grocery errand, pharmacy" }));
    expect(plan.impact[0].action).toMatch(/one trip/);
    expect(plan.impact.some((i) => i.effect.includes("96") && i.effect.includes("170"))).toBe(true);
  });

  it("tailors family advice to the household", () => {
    const plan = rulePlan(makeAir(), profile({ household: ["someone with asthma or a lung condition"] }));
    expect(plan.family.map((f) => f.who)).toContain("Asthma / lung condition");
  });

  it("still returns a complete plan when there is no forecast", () => {
    const plan = rulePlan(makeAir({ hours: [], days: [], cleanWindows: [] }), profile({ routine: "evening walk" }));
    expect(plan.schedule.length).toBeGreaterThan(3);
    expect(plan.headline).toBeTruthy();
  });
});
