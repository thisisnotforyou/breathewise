// Guarantees the planner's promise regardless of what the model returns:
// every time the user stated stays at exactly that time, only those items are marked fixed,
// and flexible items never overlap a fixed commitment.
import { parseRoutine } from "./routine";
import type { Exposure, Plan } from "./types";

const mins = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-zऀ-ॿ]+/).filter((w) => w.length >= 4));
/** Share of the activity's words that appear in the commitment (1 = "Tuition" for "tuition"). */
const matchScore = (activity: string, commitment: string) => {
  const wa = [...words(activity)];
  const wc = words(commitment);
  if (!wa.length) return 0;
  return wa.filter((w) => wc.has(w)).length / wa.length;
};
const PREP = /prepar|before|get ready|leav|mask|n95|pack/i;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Duration assumed for a fixed commitment when the user gives only a start time. */
export const FIXED_MINUTES = 60;

export function enforceFixed(plan: Plan, routineText: string, exposureAt: (time: string) => Exposure = () => "medium"): Plan {
  const { fixed, flexible } = parseRoutine(routineText || "");
  let schedule: Plan["schedule"] = (plan.schedule ?? []).map((s) => ({ ...s, fixed: false }));

  // 1. Pin each stated commitment to its exact time (reuse the model's item when it clearly refers to it).
  for (const c of fixed) {
    let idx = -1;
    let best = 0;
    schedule.forEach((s, i) => {
      const score = s.fixed || PREP.test(s.activity) ? 0 : matchScore(s.activity, c.text);
      if (score > best) [best, idx] = [score, i];
    });
    // No name match (e.g. the model wrote it in Hindi): take the closest non-preparation item within 20 minutes.
    if (best < 0.5) {
      idx = -1;
      let gap = 21;
      schedule.forEach((s, i) => {
        const d = Math.abs(mins(s.time) - mins(c.time));
        if (!s.fixed && !PREP.test(s.activity) && d < gap) [gap, idx] = [d, i];
      });
      if (idx >= 0) best = 1;
    }
    if (idx >= 0 && best >= 0.5) {
      // If the model copied the time into the name ("6 baje tuition hai"), use the clean label ("Tuition").
      const name = /\d/.test(schedule[idx].activity) ? cap(c.text) : schedule[idx].activity;
      schedule[idx] = { ...schedule[idx], activity: name, time: c.time, fixed: true };
    }
    else schedule.push({ time: c.time, activity: cap(c.text), why: "Fixed in your routine.", exposure: exposureAt(c.time), fixed: true });
  }

  // 2. Nothing flexible may sit inside a fixed commitment's hour:
  //    - one preparation step is kept, 15 minutes before it;
  //    - the user's own flexible tasks move to just after it;
  //    - anything else the model added inside that hour is dropped (it would only clutter).
  const windows = fixed.map((c) => [mins(c.time), mins(c.time) + FIXED_MINUTES] as const);
  const isUserTask = (activity: string) => flexible.some((f) => matchScore(activity, f) >= 0.5 || matchScore(f, activity) >= 0.5);
  const prepUsed = new Set<number>();
  const out: Plan["schedule"] = [];
  for (const s of schedule) {
    if (s.fixed) {
      out.push(s);
      continue;
    }
    const t = mins(s.time);
    const hit = windows.find(([a, b]) => t >= a - 15 && t < b);
    if (!hit) {
      out.push(s);
      continue;
    }
    if (PREP.test(s.activity)) {
      if (prepUsed.has(hit[0])) continue;
      prepUsed.add(hit[0]);
      out.push({ ...s, time: clock(Math.max(0, hit[0] - 15)) });
    } else if (isUserTask(s.activity)) {
      out.push({ ...s, time: clock(hit[1]) });
    }
  }
  // Drop duplicates (same activity twice).
  const seen = new Set<string>();
  schedule = out.filter((s) => {
    const k = s.activity.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  schedule.sort((a, b) => a.time.localeCompare(b.time) || Number(b.fixed) - Number(a.fixed));
  return { ...plan, schedule };
}

/** Human-readable list of what enforceFixed changed (shown in "How this plan was made"). */
export function describeCorrections(before: Plan, after: Plan): string[] {
  const out: string[] = [];
  const key = (a: string) => a.toLowerCase().trim();
  for (const item of after.schedule.filter((s) => s.fixed)) {
    const was = before.schedule.find((s) => key(s.activity) === key(item.activity)) ?? before.schedule.find((s) => s.time === item.time && !PREP.test(s.activity));
    if (!was) out.push(`Added your fixed "${item.activity}" at ${item.time} (the AI had left it out).`);
    else if (was.time !== item.time) out.push(`Moved "${item.activity}" back to your fixed time ${item.time} (the AI had ${was.time}).`);
  }
  const removed = before.schedule.length + out.filter((x) => x.startsWith("Added")).length - after.schedule.length;
  if (removed > 0) out.push(`Removed ${removed} overlapping suggestion${removed > 1 ? "s" : ""} inside a fixed commitment's hour.`);
  return out;
}
