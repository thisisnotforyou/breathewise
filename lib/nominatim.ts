// OpenStreetMap Nominatim, used for exact addresses and naming the user's current location.
// Its usage policy allows at most 1 request per second, with an identifying User-Agent;
// requests are spaced out here and cached for a day.
const BASE = "https://nominatim.openstreetmap.org/";
const HEADERS = { "User-Agent": "BreatheWise/1.0 (air-quality demo app)", "Accept-Language": "en" };
let last = 0;

export async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const wait = last + 1100 - Date.now();
  last = Math.max(Date.now(), last + 1100);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  const r = await fetch(`${BASE}${path}?${new URLSearchParams({ format: "jsonv2", ...params })}`, { headers: HEADERS, next: { revalidate: 86_400 } });
  if (!r.ok) throw new Error(`Location service ${r.status}`);
  return r.json();
}
