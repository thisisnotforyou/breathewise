// Turns a typed routine ("3 PM school pickup, grocery errand, 6 baje tuition hai")
// into fixed commitments (with a time) and flexible tasks (without one).
// Used by the rule-based fallback plan; the AI planner reads the raw text itself.

export type Commitment = { time: string; text: string };
export type ParsedRoutine = { fixed: Commitment[]; flexible: string[] };

const TIME = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?|baje|bje|o'?clock)?\b/i;

const pad = (n: number) => String(n).padStart(2, "0");

/** Converts a matched time to 24h "HH:MM". "baje"/bare hours 1–6 are read as afternoon/evening. */
export function toClock(h: number, m: number, suffix: string | undefined): string | null {
  if (h > 23 || m > 59) return null;
  const s = (suffix || "").toLowerCase().replace(/\./g, "");
  if (s === "pm" && h < 12) h += 12;
  else if (s === "am" && h === 12) h = 0;
  else if ((s === "baje" || s === "bje" || s === "" || s.startsWith("o")) && h >= 1 && h <= 6) h += 12; // "6 baje tuition" → 18:00
  return `${pad(h)}:${pad(m)}`;
}

export function parseRoutine(text: string): ParsedRoutine {
  const fixed: Commitment[] = [];
  const flexible: string[] = [];
  const parts = text
    .split(/[\n,;]+|\band\b|\baur\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const m = part.match(TIME);
    // Ignore bare numbers that are clearly not times (e.g. "2 kids") unless a time word follows.
    const isTime = m && (m[2] || m[3] || /\b(at|by|se|tak)\s*\d/i.test(part));
    if (m && isTime) {
      const clock = toClock(Number(m[1]), Number(m[2] || 0), m[3]);
      const label = part.replace(m[0], "").replace(/\b(at|by|hai|he|h)\b/gi, "").replace(/\s+/g, " ").trim();
      if (clock && label) {
        fixed.push({ time: clock, text: label });
        continue;
      }
    }
    flexible.push(part.replace(/\s+/g, " "));
  }
  fixed.sort((a, b) => a.time.localeCompare(b.time));
  return { fixed, flexible };
}
