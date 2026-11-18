import { describe, expect, it } from "vitest";
import { enforceFixed } from "@/lib/enforce";
import type { Plan } from "@/lib/types";

const base = (schedule: Plan["schedule"]): Plan => ({ headline: "h", summary: "s", schedule, family: [], indoor: [], commute: [], swaps: [], impact: [], weekAhead: "", healthWatch: [] });
const item = (time: string, activity: string, fixed = false) => ({ time, activity, why: "", exposure: "medium" as const, fixed });

describe("enforceFixed", () => {
  it("moves a drifted commitment back to the user's stated time", () => {
    const out = enforceFixed(base([item("18:59", "Arrive at tuition", true)]), "6 baje tuition hai");
    expect(out.schedule).toEqual([expect.objectContaining({ time: "18:00", activity: "Arrive at tuition", fixed: true })]);
  });

  it("only marks the user's own commitments as fixed", () => {
    const out = enforceFixed(base([item("15:00", "School pickup", true), item("19:59", "Return home", true)]), "3 PM school pickup");
    expect(out.schedule.find((s) => s.activity === "Return home")?.fixed).toBe(false);
  });

  it("moves the user's own flexible tasks out of a fixed commitment's hour", () => {
    const out = enforceFixed(base([item("18:00", "Evening walk"), item("18:00", "Tuition", true)]), "6 baje tuition, evening walk");
    expect(out.schedule.map((s) => [s.time, s.activity])).toEqual([
      ["18:00", "Tuition"],
      ["19:00", "Evening walk"],
    ]);
  });

  it("never pins a preparation step, keeps one prep step, and clears filler from the fixed hour", () => {
    const out = enforceFixed(
      base([
        item("17:45", "Rest before tuition"),
        item("18:00", "Prepare for tuition"),
        item("18:20", "Attend tuition"),
        item("18:30", "Evening walk"),
        item("18:40", "Indoor activity"),
        item("21:00", "Sleep"),
      ]),
      "6 baje tuition hai, evening walk"
    );
    expect(out.schedule.map((s) => [s.time, s.activity, s.fixed])).toEqual([
      ["17:45", "Rest before tuition", false],
      ["18:00", "Attend tuition", true],
      ["19:00", "Evening walk", false],
      ["21:00", "Sleep", false],
    ]);
  });

  it("matches a commitment written in another language by its time", () => {
    const out = enforceFixed(base([item("15:10", "स्कूल से बच्चे लेना")]), "3 PM school pickup");
    expect(out.schedule).toEqual([expect.objectContaining({ time: "15:00", activity: "स्कूल से बच्चे लेना", fixed: true })]);
  });

  it("cleans a time copied into the activity name", () => {
    const out = enforceFixed(base([item("18:00", "6 baje tuition hai")]), "6 baje tuition hai");
    expect(out.schedule[0]).toMatchObject({ activity: "Tuition", fixed: true });
  });

  it("adds a commitment the model forgot", () => {
    const out = enforceFixed(base([item("07:00", "Breakfast")]), "3 PM school pickup");
    expect(out.schedule.find((s) => s.time === "15:00")).toMatchObject({ activity: "School pickup", fixed: true });
  });

  it("leaves a plan without stated times unchanged apart from fixed flags", () => {
    const out = enforceFixed(base([item("09:00", "Walk", true)]), "evening walk");
    expect(out.schedule).toEqual([expect.objectContaining({ time: "09:00", fixed: false })]);
  });
});

import { describeCorrections } from "@/lib/enforce";

describe("describeCorrections", () => {
  it("explains moved, added and removed items in plain words", () => {
    const before = base([item("18:59", "Tuition"), item("18:20", "Indoor activity"), item("21:00", "Sleep")]);
    const after = enforceFixed(before, "6 baje tuition hai, 3 PM school pickup");
    const notes = describeCorrections(before, after);
    expect(notes).toContain('Moved "Tuition" back to your fixed time 18:00 (the AI had 18:59).');
    expect(notes).toContain('Added your fixed "School pickup" at 15:00 (the AI had left it out).');
    expect(notes.some((n) => n.startsWith("Removed 1 overlapping"))).toBe(true);
  });

  it("says nothing when the AI already kept every fixed time", () => {
    const before = base([item("15:00", "School pickup")]);
    expect(describeCorrections(before, enforceFixed(before, "3 PM school pickup"))).toEqual([]);
  });
});
