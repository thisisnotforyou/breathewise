# BreatheWise

**Don't just check the AQI. Know what to do today.**

BreatheWise is a GenAI assistant for families living through severe urban air pollution. You tell it your city and your day in your own words, for example *"3 PM school pickup, grocery errand, evening walk, 6 baje tuition hai"*. It plans the day around the real hourly forecast, keeps the times you can't move, shifts everything else to cleaner hours, and explains what each change achieves.

**Challenge vertical:** PromptWars Virtual, Challenge 06: Urban Air Quality Assistant.

## What it does

| Need from the brief | How BreatheWise handles it |
|---|---|
| Location-aware | Maps-style search with live suggestions for cities, areas, streets, shops and malls (Photon/OpenStreetMap by default, Google Places if `GOOGLE_PLACES_API_KEY` is set), or a 6-digit Indian PIN code → its exact localities via India Post. Picking a precise place flies the 3D view to that exact spot, or "Use my location" (named, e.g. "Lajpat Nagar, Delhi") → live US AQI, PM2.5, PM10, NO₂, O₃, SO₂, CO, a 24-hour hourly forecast, a daily outlook (Open-Meteo / Copernicus CAMS) and current weather (wind and rain are passed to the planner) |
| Low-emission daily routine | A timed plan built around the user's typed routine. Fixed commitments keep their exact time (tagged **Fixed**); flexible tasks move to the cleanest forecast hours |
| Indoor air | Practical, costed actions (₹) that fit the home type and household, including at least one that can be done today |
| Sustainable alternatives and impact | Cleaner commute options, lifestyle swaps, and a "What changes if you do this" section. Numbers appear only when they come straight from the data (for example "AQI 96 at 13:00 vs 170 now"); otherwise the effect is described in words |
| Tailored to lifestyle | Household members (kids, elderly, asthma, pregnancy, pets, outdoor exercise), family size, commute and home type all change the advice |
| Transparency | "How this plan was made" under every AI plan shows the exact prompt sent to the model, its raw reply, and any fixed times BreatheWise corrected afterwards |
| Follow-up questions | A chat grounded in the same live data |
| English and Hindi | Full interface and AI output in both; Hinglish routines are understood |

**Two interfaces, one engine.** `/` is the calm, planner-first view. `/v2` (Explorer) is a light dashboard: the selected city's 3D landmark miniature beside a main-statistics card, live weather (temperature, humidity, wind, rain and what it means for smog) and a "furthest above WHO guideline" pollutant callout, plus a real 3D globe (MapLibre globe projection) with live AQI markers for 15 Indian cities at their true coordinates, a Globe/Air-map switch, zoom and reset. Both share the same API routes, planner and tests via `lib/useBreatheWise.ts`.

Visuals: each searched place opens on a 3D miniature of its best-known landmark. About 85 landmarks are hand-picked (India Gate, Hawa Mahal, Taj Mahal, Mehrangarh, Meenakshi Temple, Konark, Burj Khalifa…) and are only used for the city they belong to (within ~12 km, or the same city name up to 35 km). Anywhere else, `/api/landmark` finds the most notable landmark within 10 km on Wikipedia in one request (Faridabad → Badkhal Lake, Imphal → Kangla Fort); if there is none, the place itself is shown. A landmark from another city is never used, with small cars driving the real road network and a smog haze that thickens with the live AQI. An optional Satellite view uses Google Photorealistic 3D Tiles.

## How it works

```
Browser (Next.js App Router + Tailwind)
  │ GET  /api/air   geocode → Open-Meteo air quality (current, hourly, daily) + weather → hotspots (WAQI or CAMS grid)
  │ GET  /api/places   search suggestions: Google Places or Photon (addresses, shops, areas, cities), PIN-code areas (India Post)
  │ GET  /api/geocode  exact coordinates for a picked Google place or PIN-code area (Nominatim)
  │ GET  /api/reverse  names the user's current location (Nominatim; coordinates rounded to ~100 m)
  │ GET  /api/landmark  most notable landmark near a place (Wikipedia, one request, cached a day)
  │ GET  /api/cities  live US AQI for 15 Indian cities, or ?scope=world for 110+ cities worldwide (batched, cached 10 min)
  │ POST /api/plan  validate → cache lookup → LLM (JSON mode) → structured Plan
  │                 └─ on no key / error / rate limit → deterministic rule-based Plan (clearly labelled)
  │ POST /api/chat  LLM chat with the live data and household in the system prompt
  ▼
lib/
  aqi.ts        AQI bands (with written labels), cleanest-hour ranking, daily summaries
  routine.ts    parses a typed routine into fixed commitments (with times, incl. "6 baje") and flexible tasks
  prompt.ts     system prompt, data context and the JSON shape the model must return
  llm.ts        OpenAI first, Gemini as automatic backup (or the reverse via LLM_PROVIDER)
  rules.ts      rule-based fallback plan using the same routine parser and forecast
  enforce.ts    pins the user's fixed times on AI plans and clears overlaps
  guard.ts      input validation and per-IP rate limiting
  landmarks.ts  hand-picked landmarks for the 3D scene, matched to the same city only
  wikiLandmark.ts  picks a real landmark from nearby Wikipedia articles (drops neighbourhoods, stations, schools)
  traffic.ts    small 3D cars moving along roads from the map tiles
  weather.ts    current weather and its plain-language effect on smog
  pollutants.ts which pollutant is furthest above its WHO 2021 guideline
  cities.ts     the 15 Indian cities on the globe
  useBreatheWise.ts  shared client state/actions for both interfaces
```

**Decision logic.** The planner receives the current readings, every forecast hour for the next 24 hours, the cleanest daytime hours, the daily outlook, the household and the routine text. The prompt requires it to keep stated times fixed, to schedule flexible tasks in low-AQI hours, to add protection advice for fixed commitments in bad hours, and never to invent pollution numbers. Pollution data always comes from the data provider; the model only interprets it.

After the model answers, `lib/enforce.ts` checks the plan against the user's own words: every stated time is pinned back to exactly that time, only those items are marked fixed, one preparation step is kept just before each commitment, the user's flexible tasks are moved out of a commitment's hour, and filler the model added inside that hour is removed. This keeps the "your fixed times never move" promise even when the model drifts.

**Assumptions**
- The "furthest above WHO guideline" callout compares each pollutant with the WHO 2021 daily guideline; it is not a regulatory AQI sub-index and is labelled that way.
- US AQI is used because it is what Open-Meteo provides consistently worldwide. Indian NAQI categories differ slightly.
- Forecasts are model estimates (Copernicus CAMS, ~10–40 km resolution), not readings from a nearby monitoring station, unless a WAQI token is set.
- A bare time from 1 to 6 with no AM/PM (for example "6 baje") is read as afternoon or evening, which matches how such routines are usually written.
- Costs in ₹ are approximate market prices for guidance only.
- Advice is general guidance, not medical advice.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # then add at least one AI key
npm run dev                  # http://localhost:3000
npm test                     # 77 automated checks
npm run lint                 # ESLint (Next.js core-web-vitals + TypeScript rules)
```

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY`, `OPENAI_MODEL` | OpenAI GPT (default model `gpt-4.1-mini`) |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google Gemini (default `gemini-2.5-flash`) |
| `LLM_PROVIDER` | Optional: `openai` or `gemini` to choose the primary when both are set |
| `WAQI_TOKEN` | Optional: free token from aqicn.org/data-platform/token for station-level hotspots |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional: enables the Satellite 3D view (Map Tiles API) |
| `GOOGLE_PLACES_API_KEY` | Optional, server-only: Google Places (New) search suggestions. Without it, search uses OpenStreetMap (Photon) |

### Satellite 3D view (optional)

1. In Google Cloud Console, create a project, turn on billing, and enable **Map Tiles API**.
2. Create an API key and restrict it to the Map Tiles API and to your site's domains (HTTP referrers).
3. Add it as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. This key is used in the browser, which is why it must be restricted. Google's logo and data credits are shown on the scene as its terms require.

## Testing

`npm test` runs 77 checks with Vitest, covering:

- **Typical city:** AQI bands, cleanest-hour ranking, landmark lookup for Delhi and Jaipur.
- **Unknown location:** the air API returns a readable 404; invalid coordinates return 400; a town with no landmark falls back to its state's icon or the city centre.
- **Provider failure:** OpenAI failing falls back to Gemini; all providers failing falls back to the labelled rule-based plan; the air service being down returns 502.
- **Changed routine:** adding "6 baje tuition hai" adds a fixed 18:00 item while the 15:00 pickup stays put; the routine text reaches the model prompt.
- **No forecast:** a complete plan is still produced; weather or city readings that fail are shown as unavailable, never invented.
- **Security:** oversized or malformed input is clamped or rejected.

## Security, efficiency and accessibility

- **Security:** AI keys stay on the server and out of the repository (`.env.local` is git-ignored). All API input is validated and size-limited before reaching the model. Per-IP rate limiting protects the key on a public deployment.
- **Efficiency:** the model is called only when the user asks for a plan or changes their day. Identical plan requests are cached for 15 minutes on the server, air data is cached for 10 minutes per location, and Open-Meteo responses are revalidated every 10 minutes.
- **Light, dark and auto themes:** a header switch (Auto follows the device), applied before first paint so there is no flash.
- **World view:** the homepage globe and ranking cover 110+ major cities worldwide (India / World switch), each with its country flag and a full forecast and plan on tap.
- **Mobile and desktop:** sticky header with section links (desktop) and a thumb-friendly bottom bar (phones) that highlight the section in view; maps need two fingers on touch screens so they never trap page scrolling; the hourly chart can be scrubbed by mouse, touch or arrow keys.
- **Accessibility:** every AQI colour also has a written category (English and Hindi); all controls are labelled and keyboard-reachable with visible focus; status changes are announced to screen readers; the hourly chart has a text alternative; animation stops for users who prefer reduced motion; layouts are tested at phone width (375 px).

## GenAI services

**Used by the running app**

- **OpenAI GPT** (`gpt-4.1-mini`, set by `OPENAI_MODEL`): writes the structured daily plan in `/api/plan` (JSON mode) and answers follow-up questions in `/api/chat`. It receives only the live readings, the hourly forecast, current weather, the household profile and the user's own routine text, and is told never to invent pollution numbers. Its raw reply is checked on the server (`lib/enforce.ts`) so stated times stay fixed, and the whole exchange is visible in the app under **"How this plan was made"**.
- **Google Gemini** (`gemini-2.5-flash`, optional): automatic backup if GPT is unavailable (`lib/llm.ts`).
- **No AI fallback:** if neither model answers, a deterministic rule-based plan is shown and clearly labelled "Basic plan".

**Used to build the app (development only)**

- **Claude Code** (Anthropic's AI coding agent) was used to write, refactor, test and debug this codebase through prompting, with every change reviewed and verified in the browser and by the automated tests.
- No AI service is used at build time; the deployed app only calls the services listed above.

## Deploy

1. Push this folder to a public GitHub repository (one branch).
2. Import the repo at vercel.com/new (framework preset: Next.js).
3. Add the environment variables under Settings → Environment Variables.
4. Deploy, then open the URL in a signed-out browser to check it.

## Data and credits

Air quality: Open-Meteo / Copernicus Atmosphere Monitoring Service; World Air Quality Index Project (WAQI). Maps: OpenFreeMap, OpenMapTiles, © OpenStreetMap contributors; Google Photorealistic 3D Tiles. Elevation and weather: Open-Meteo. Landmark lookup: Wikipedia (CC BY-SA). PIN codes: India Post (api.postalpincode.in). Search suggestions: Photon by Komoot (OpenStreetMap data), or Google Places when configured. Addresses and place names: © OpenStreetMap contributors via Nominatim (max 1 request/second, enforced in `lib/nominatim.ts`).
