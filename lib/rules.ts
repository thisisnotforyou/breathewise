// Deterministic fallback plan used when no AI provider is configured or all providers fail.
import { band, hhmm, hourOf } from "./aqi";
import { parseRoutine } from "./routine";
import type { AirData, Exposure, Plan, Profile } from "./types";

export function rulePlan(air: AirData, p: Profile): Plan {
  const a = air.current.aqi;
  const best = air.cleanWindows[0] ? hhmm(hourOf(air.cleanWindows[0].time)) : "14:00";
  const bad = a > 150;
  const veryBad = a > 200;
  const has = (s: string) => p.household.some((h) => h.toLowerCase().includes(s));
  const bestDay = [...air.days].sort((x, y) => x.avg - y.avg)[0];
  const routine = parseRoutine(p.routine || "");
  const aqiAt = (time: string) => air.hours.find((h) => hhmm(hourOf(h.time)) === `${time.slice(0, 2)}:00`)?.aqi ?? a;
  const exposureOf = (v: number): Exposure => (v > 150 ? "high" : v > 100 ? "medium" : "low");
  const clean = air.cleanWindows.map((h) => hhmm(hourOf(h.time)));
  const worstDay = [...air.days].sort((x, y) => y.avg - x.avg)[0];

  const family: Plan["family"] = [];
  if (has("child")) family.push({ who: "Children", advice: bad ? "Indoor play only today; if school is outdoors, send a well-fitted child-size N95." : `Outdoor play around ${best}, not in the evening.` });
  if (has("elder")) family.push({ who: "Elderly", advice: "Skip morning walks while AQI is high; walk indoors or in a mall corridor instead." });
  if (has("asthma")) family.push({ who: "Asthma / lung condition", advice: "Keep reliever inhaler handy, stay in the purifier room, and follow your action plan if symptoms rise." });
  if (has("pregnan")) family.push({ who: "Pregnancy", advice: "Minimise outdoor time and traffic exposure; sleep in the cleanest room." });
  if (has("pet")) family.push({ who: "Pets", advice: `Keep walks short and time them around ${best}.` });
  if (has("exercis")) family.push({ who: "Outdoor exerciser", advice: bad ? "Move workouts indoors today." : `Exercise around ${best}, away from main roads.` });
  if (!family.length) family.push({ who: "Everyone", advice: band(a).advice.en });

  const base: Plan["schedule"] = [
    { time: "06:30", activity: bad ? "Keep windows shut; skip the outdoor walk" : "Short walk only if AQI is under 100", why: "Early-morning temperature inversions trap smog near the ground.", exposure: "high" },
    { time: "07:30", activity: p.commute === "Car" ? "Drive with AC on recirculation, windows up" : "Wear a well-fitted N95 for the commute", why: "Traffic corridors have the highest NO₂ and PM levels.", exposure: "high" },
    { time: best, activity: "Air out the home for 10–15 minutes", why: `Lowest forecast AQI of the day (${air.cleanWindows[0]?.aqi ?? a}).`, exposure: "low" },
    { time: "17:00", activity: "Indoor exercise or play instead of the park", why: "Evening traffic and cooling air push AQI up again.", exposure: "medium" },
    { time: "19:30", activity: "Cook with lids on and the exhaust running; no incense or mosquito coils", why: "Indoor combustion spikes PM2.5 inside the home.", exposure: "medium" },
    { time: "21:30", activity: "Run the purifier in the bedroom with the door closed", why: "You breathe that room's air for about 8 hours.", exposure: "low" },
  ];
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  // Fixed commitments keep their exact time; generic items within 45 minutes of one are dropped.
  const fixedItems: Plan["schedule"] = routine.fixed.map((c) => {
    const v = aqiAt(c.time);
    return { time: c.time, activity: c.text, why: `Fixed in your routine. Forecast AQI ${v}${v > 150 ? " — wear an N95 and keep it short." : "."}`, exposure: exposureOf(v), fixed: true };
  });
  // Flexible tasks (no time given) go into the cleanest daytime hours, one per slot.
  const flexItems: Plan["schedule"] = routine.flexible.slice(0, 3).map((task, i) => {
    const slot = clean[i % Math.max(1, clean.length)] ?? best;
    return { time: slot, activity: task, why: `Moved to a cleaner hour (forecast AQI ${aqiAt(slot)}).`, exposure: exposureOf(aqiAt(slot)) };
  });
  const taken = [...fixedItems, ...flexItems].map((x) => minutes(x.time));
  const schedule = [...base.filter((b) => taken.every((t) => Math.abs(t - minutes(b.time)) > 45)), ...fixedItems, ...flexItems].sort((x, y) => x.time.localeCompare(y.time));

  const impact: Plan["impact"] = [];
  const errands = routine.flexible.filter((x) => /errand|shop|grocer|market|bazaar|sabzi|kirana|bank|pharmacy|chemist|post office|bill/i.test(x));
  if (errands.length >= 2) impact.push({ action: `Do "${errands[0]}" and "${errands[1]}" in one trip`, effect: "Avoids one extra round trip — less time in traffic smoke and fewer vehicle emissions." });
  else if (errands.length === 1 && routine.fixed.length) impact.push({ action: `Do "${errands[0]}" on the way to "${routine.fixed[0].text}"`, effect: "Combines two outings into one, so one round trip is avoided." });
  if (air.cleanWindows[0] && a > air.cleanWindows[0].aqi!) impact.push({ action: `Go out around ${best} instead of now`, effect: `Forecast AQI ${air.cleanWindows[0].aqi} at ${best} vs ${a} right now.` });
  impact.push({ action: "Sleep in one purifier room with the door closed", effect: "Cuts the PM2.5 you breathe for the longest stretch of the day." });

  return {
    headline: veryBad ? "Stay in, seal up, filter the air" : bad ? "Mask up and keep outdoor time short" : "Use the clean hours, avoid the evening peak",
    summary: `AQI is ${a} (${band(a).en}) in ${air.location.name}. ${band(a).advice.en} The cleanest window today is around ${best}.`,
    schedule,
    family,
    indoor: [
      { tip: "Build a DIY purifier: box fan with a MERV-13 filter strapped to the intake", cost: "≈ ₹2,500" },
      { tip: "Seal window and door gaps with weather strips", cost: "≈ ₹300" },
      { tip: "Wet-mop instead of sweeping to avoid stirring up dust", cost: "free" },
      { tip: "Make one 'clean room' (usually a bedroom) and run the purifier there", cost: "free" },
      { tip: "Skip incense, candles and mosquito coils on high-AQI days", cost: "free" },
      { tip: "Don't count on indoor plants: their effect on PM2.5 is negligible", cost: "free" },
    ],
    commute: [
      p.commute === "Car"
        ? { option: "Carpool, or take the metro 2 days a week", why: "Cuts your emissions, and metro cabins are filtered." }
        : { option: "Use metro over bus or two-wheeler on bad days", why: "Enclosed, filtered cabins mean much lower exposure." },
      { option: "Pick back streets over main roads when walking or cycling", why: "Pollution drops sharply even one block away from heavy traffic." },
    ],
    impact,
    swaps: ["Never burn leaves or waste; compost wet waste", "Switch to induction cooking or ventilate the kitchen well", "Batch errands into one trip in the cleanest window", "Choose CNG/EV taxis and autos where you can"],
    weekAhead: bestDay && worstDay ? `Best day this week looks like ${bestDay.date} (avg AQI ${bestDay.avg}); worst is ${worstDay.date} (avg ${worstDay.avg}). Plan outings for the better day.` : "",
    healthWatch: ["Persistent cough, wheezing or breathlessness: rest indoors and see a doctor if it continues", "Burning eyes or sore throat: rinse with clean water and stay in filtered air", "Chest pain or severe breathlessness: get medical care right away"],
  };
}
