import { band, hhmm, hourOf } from "./aqi";
import { compass, weatherEffect } from "./weather";
import type { AirData, Lang, Profile } from "./types";

/** Bump when the prompt changes so cached plans from the old prompt are not reused. */
export const PROMPT_VERSION = 9;

export const SYSTEM = `You are BreatheWise, a practical air-pollution coach for families in polluted cities, especially South Asian cities in winter smog season.

Rules:
- Ground every recommendation in the REAL numbers you are given (current AQI, pollutants, the hourly and 7-day forecast). Never invent or change pollution readings.
- Time outdoor activities, ventilation and errands to the cleanest forecast hours, and say which hour and why.
- The user's ROUTINE may mix English and Hindi (Hinglish), e.g. "6 baje tuition hai" = tuition at 6 (evening, 18:00, unless context says morning). Commitments with a stated time are FIXED: keep them at exactly that time, never move or drop them, and mark them "fixed": true. Plan everything flexible around them, and add protective advice for fixed commitments that fall in high-AQI hours.
- Never put two activities at the same time. Assume a fixed commitment takes about 1 hour (plus travel) unless the user says otherwise, and keep flexible tasks outside that window. Write activity names in plain words (e.g. "Tuition", not "6 baje tuition"). For a fixed commitment, use the user's own wording for the activity name, even when writing in Hindi.
- Tailor advice to the household: children, elderly, asthma, pregnancy, pets, outdoor exercisers, family size, commute and home type.
- Prefer affordable, realistic actions for Indian households and give rough costs in ₹ (e.g. DIY box-fan + MERV-13 filter purifier ≈ ₹2,500, N95 mask ≈ ₹50–150, weather strips ≈ ₹300).
- Be honest: indoor plants do not meaningfully reduce PM2.5; cloth and surgical masks offer little protection against PM2.5.
- Masks are NOT recommended for children under 2 (suffocation risk) and fit poorly on young children: for toddlers and babies, protect them by reducing time outdoors, choosing cleaner hours and cleaner rooms instead.
- Suggest sustainable, low-emission alternatives that also reduce the city's pollution (metro/bus, carpooling, EV/CNG, no waste burning, induction cooking).
- When explaining impact, never invent precise numbers. Use exact figures only if they follow directly from the data given (e.g. "AQI 92 at 14:00 vs 165 at 18:00", or "combining two errands avoids one round trip"). Otherwise describe the effect qualitatively.
- You are not a doctor. Recommend seeing a doctor for symptoms; never diagnose.`;

export function langRule(lang: Lang) {
  return lang === "hi"
    ? "Write every text value in simple, natural Hindi (Devanagari script). Keep numbers, times (HH:MM) and units like AQI, PM2.5, N95 as they are."
    : "Write in simple, clear English.";
}

export function contextText(air: AirData, p: Profile) {
  const c = air.current;
  const hourly = air.hours.map((h) => `${hhmm(hourOf(h.time))}=${h.aqi ?? "?"}`).join(", ");
  const days = air.days.map((d) => `${d.date}: avg ${d.avg}, min ${d.min}, max ${d.max}`).join("; ");
  return `LOCATION: ${air.location.name} (timezone ${air.location.timezone}). Local time now: ${c.time}.
CURRENT: US AQI ${c.aqi} (${band(c.aqi).en}). PM2.5 ${c.pm25} µg/m³, PM10 ${c.pm10}, NO2 ${c.no2}, O3 ${c.o3}, CO ${c.co}, SO2 ${c.so2}.
NEXT 24 HOURS (US AQI by hour): ${hourly}.
CLEANEST DAYTIME HOURS: ${air.cleanWindows.map((h) => `${hhmm(hourOf(h.time))} (${h.aqi})`).join(", ") || "n/a"}.
7-DAY OUTLOOK: ${days}.
WEATHER NOW: ${air.weather ? `${air.weather.tempC}°C, humidity ${air.weather.humidity}%, wind ${air.weather.windKmh} km/h ${compass(air.weather.windDir)}, rain ${air.weather.precipMm} mm, cloud ${air.weather.cloud}%. ${weatherEffect(air.weather)}` : "unavailable."}
HOUSEHOLD: ${p.members} people; ${p.household.length ? p.household.join(", ") : "no special health needs mentioned"}.
COMMUTE: ${p.commute}. HOME: ${p.home}. NOTES FROM USER: ${p.notes || "none"}.
ROUTINE TODAY (user's words): ${p.routine || "not given — suggest a sensible day"}.`;
}

export const PLAN_SHAPE = `Return ONLY a JSON object with exactly this shape:
{
  "headline": "one punchy line (max 12 words) telling them the single most important thing today",
  "summary": "2-3 sentences: what today's air means for THIS household, citing the actual AQI and best hours",
  "schedule": [{"time": "HH:MM", "activity": "...", "why": "cite forecast AQI or the pollution reason", "exposure": "low|medium|high", "fixed": true|false}],
  "family": [{"who": "a specific household member or group", "advice": "specific precaution for them today"}],
  "indoor": [{"tip": "indoor air quality action", "cost": "free | approx ₹ amount"}],
  "commute": [{"option": "a cleaner or safer way to make their commute", "why": "exposure and emissions benefit"}],
  "swaps": ["sustainable lifestyle change that cuts emissions"],
  "impact": [{"action": "a specific suggestion from this plan", "effect": "what changes if they do it (exposure avoided, trip avoided, cleaner hour used) — numbers only when supported by the data above"}],
  "weekAhead": "1-2 sentences using the 7-day outlook: which day is best/worst and what to plan around it",
  "healthWatch": ["symptom or warning sign to watch and what to do"]
}
schedule: 7-9 items in time order covering wake-up to bedtime, including every fixed commitment from the routine. family: 2-4 items. indoor: 4-5 (at least one doable today with what they have). commute: 2-3. swaps: 3-4. impact: 2-3. healthWatch: 3-4.`;
