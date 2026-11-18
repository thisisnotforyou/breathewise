import type { Day, Hour } from "./types";

export type Band = { max: number; en: string; hi: string; color: string; advice: { en: string; hi: string } };

export const BANDS: Band[] = [
  { max: 50, en: "Good", hi: "अच्छा", color: "#3a9d5d", advice: { en: "Air is clean. Enjoy time outdoors.", hi: "हवा साफ़ है। बाहर समय बिताएँ।" } },
  { max: 100, en: "Moderate", hi: "मध्यम", color: "#c9a227", advice: { en: "Fine for most. Very sensitive people should limit long exertion.", hi: "अधिकतर लोगों के लिए ठीक। संवेदनशील लोग लंबी मेहनत कम करें।" } },
  { max: 150, en: "Unhealthy for sensitive groups", hi: "संवेदनशील लोगों के लिए हानिकारक", color: "#e07b24", advice: { en: "Kids, elderly and people with asthma should cut outdoor time.", hi: "बच्चे, बुज़ुर्ग और अस्थमा वाले लोग बाहर कम जाएँ।" } },
  { max: 200, en: "Unhealthy", hi: "हानिकारक", color: "#d0412f", advice: { en: "Everyone should limit outdoor exertion and wear an N95 outside.", hi: "सभी बाहर मेहनत कम करें और N95 मास्क पहनें।" } },
  { max: 300, en: "Very unhealthy", hi: "बहुत हानिकारक", color: "#8e3b8f", advice: { en: "Stay indoors with filtered air. Avoid all outdoor exercise.", hi: "फ़िल्टर की हुई हवा में घर के अंदर रहें। बाहर व्यायाम न करें।" } },
  { max: Infinity, en: "Hazardous", hi: "ख़तरनाक", color: "#6d1f2a", advice: { en: "Health emergency. Stay indoors, run purifiers, seal windows.", hi: "स्वास्थ्य आपातकाल। घर में रहें, प्यूरीफ़ायर चलाएँ, खिड़कियाँ बंद रखें।" } },
];

export const band = (v: number | null | undefined): Band => BANDS.find((b) => (v ?? 0) <= b.max)!;

export const hourOf = (iso: string) => Number(iso.slice(11, 13));
export const hhmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** The three lowest-AQI daytime hours (06:00–21:00) in the given window, in time order. */
export function cleanWindows(hours: Hour[]): Hour[] {
  return hours
    .filter((h) => h.aqi != null && hourOf(h.time) >= 6 && hourOf(h.time) <= 21)
    .sort((a, b) => a.aqi! - b.aqi!)
    .slice(0, 3)
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function dailySummary(times: string[], aqi: (number | null)[]): Day[] {
  const byDate = new Map<string, number[]>();
  times.forEach((t, i) => {
    const v = aqi[i];
    if (v == null) return;
    const d = t.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(v);
  });
  return [...byDate.entries()]
    .filter(([, v]) => v.length >= 12)
    .map(([date, v]) => ({
      date,
      min: Math.round(Math.min(...v)),
      max: Math.round(Math.max(...v)),
      avg: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    }))
    .slice(0, 7);
}
