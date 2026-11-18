import { describe, expect, it } from "vitest";
import { parseRoutine, toClock } from "@/lib/routine";

describe("parseRoutine", () => {
  it("keeps stated times as fixed commitments and the rest as flexible", () => {
    const r = parseRoutine("3 PM school pickup, grocery errand, evening walk");
    expect(r.fixed).toEqual([{ time: "15:00", text: "school pickup" }]);
    expect(r.flexible).toEqual(["grocery errand", "evening walk"]);
  });

  it("understands Hinglish 'baje' as an evening time", () => {
    const r = parseRoutine("6 baje tuition hai");
    expect(r.fixed).toEqual([{ time: "18:00", text: "tuition" }]);
  });

  it("reads 24-hour times and sorts commitments", () => {
    const r = parseRoutine("doctor at 16:30\n9am office call");
    expect(r.fixed.map((f) => f.time)).toEqual(["09:00", "16:30"]);
  });

  it("does not mistake counts for times", () => {
    const r = parseRoutine("take 2 kids to the park");
    expect(r.fixed).toEqual([]);
    expect(r.flexible).toEqual(["take 2 kids to the park"]);
  });

  it("returns nothing for an empty routine", () => {
    expect(parseRoutine("")).toEqual({ fixed: [], flexible: [] });
  });
});

describe("toClock", () => {
  it("handles am/pm edge cases and rejects impossible times", () => {
    expect(toClock(12, 0, "am")).toBe("00:00");
    expect(toClock(12, 30, "pm")).toBe("12:30");
    expect(toClock(25, 0, "")).toBeNull();
  });
});
