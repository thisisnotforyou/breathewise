"use client";
// Homepage showcase: a dark "air-quality command centre" card on the light page.
// Night-lights globe with live AQI markers, a callout on the selected city, main statistics and
// the best time to go out — all from live data (no invented scores).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { band, hhmm, hourOf } from "@/lib/aqi";
import { dict } from "@/lib/i18n";
import { dominantPollutant } from "@/lib/pollutants";
import { compass } from "@/lib/weather";
import type { AirData, Lang } from "@/lib/types";
import type { CityReading } from "@/app/api/cities/route";
import { Globe, type GlobeCallout, type GlobeHandle } from "./Globe";
import { CountUp } from "./CountUp";
import { flag } from "@/lib/cities";

type Props = { lang: Lang; cities: CityReading[]; searchSlot: ReactNode; onOpen: (c: CityReading) => void };
const noSubscribe = () => () => {};

export function HeroShowcase({ lang, cities, searchSlot, onOpen }: Props) {
  const t = dict[lang];
  const H = t.landing.hero;
  const v = t.v2;
  const [selected, setSelected] = useState("New Delhi");
  const [airByCity, setAirByCity] = useState<Record<string, AirData>>({});
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const globe = useRef<GlobeHandle>(null);

  const city = cities.find((c) => c.name === selected);
  const air = airByCity[selected];

  // Full readings for the selected city (cached per city for this visit).
  useEffect(() => {
    if (!city || airByCity[city.name]) return;
    fetch(`/api/air?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(city.name)}&region=${encodeURIComponent(city.state)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setAirByCity((m) => ({ ...m, [city.name]: j })))
      .catch(() => {});
  }, [city, airByCity]);

  const c = air?.current;
  const aqi = c?.aqi ?? city?.aqi ?? null;
  const b = band(aqi);
  const dom = c ? dominantPollutant(c) : null;
  const w = air?.weather;
  const cleanest = air?.cleanWindows?.length ? [...air.cleanWindows].sort((x, y) => x.aqi! - y.aqi!)[0] : null;
  // Only call it a "best time" if it is actually cleaner than right now.
  const best = cleanest && c && cleanest.aqi! < c.aqi ? cleanest : null;
  const cityName = city ? (lang === "hi" ? city.hi : city.name) : "…";
  const where = city && city.cc !== "IN" ? `${cityName}, ${city.state}` : cityName;
  const when = c ? new Date(c.time).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  const open = useCallback(() => city && onOpen(city), [city, onOpen]);
  const callout: GlobeCallout | null = useMemo(
    () =>
      city && aqi != null
        ? {
            title: H.airQuality(cityName),
            aqi,
            category: b[lang],
            color: b.color,
            facts: w ? [`${Math.round(w.tempC ?? 0)}°C`, `${Math.round(w.humidity ?? 0)}%`, `${Math.round(w.windKmh ?? 0)} km/h ${compass(w.windDir)}`] : [],
            actionLabel: H.planHere,
            onAction: open,
          }
        : null,
    [city, aqi, cityName, b, lang, w, H, open]
  );

  const shareText = aqi != null ? H.shareText(cityName, aqi, b[lang]) : "";
  const shareUrl = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const nativeShare = () => navigator.share?.({ title: "BreatheWise", text: shareText, url: shareUrl }).catch(() => {});

  return (
    <section className="showcase fade-up relative mt-6 overflow-hidden rounded-[32px] shadow-[0_30px_80px_-30px_rgba(10,18,48,0.6)] ring-1 ring-black/5">
      <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-4">
        {/* Left column */}
        <div className="relative z-10 flex flex-col gap-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#8fc8ff]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5ab8ff] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5ab8ff]" />
              </span>
              {H.live}
            </p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
              {v.title1} <span className="text-[#8d97c4]">{v.title2}</span>
            </h1>
            <p className="mt-3 text-[15px] text-[#c7cff0]">{when || " "}</p>
            <p className="text-[15px] text-[#c7cff0]">
              {H.local} → <span aria-hidden="true">{city ? flag(city.cc) : ""}</span> <b className="font-medium text-white">{where}</b>
            </p>
          </div>

          <article className="rounded-[20px] bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur">
            <h2 className="text-xl font-medium">{v.mainStats}</h2>
            <p className="mt-2 text-sm text-[#9aa5cf]">US {H.aqi}</p>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-semibold leading-none tabular-nums"><CountUp value={aqi} /></span>
              <span className="mb-1 flex items-center gap-1.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color, boxShadow: `0 0 10px ${b.color}` }} aria-hidden="true" />
                {aqi != null ? b[lang] : ""}
              </span>
            </div>
            <p className="mt-3 text-sm text-[#c7cff0]">
              {H.dominant} <b className="ml-1 font-medium text-white">{dom ? dom.label : "—"}</b>
              {dom && <span className="text-[#9aa5cf]"> — {H.vsWho(dom.times.toFixed(1))}</span>}
              {w?.windKmh != null && <span className="text-[#9aa5cf]"> · {v.wind} {Math.round(w.windKmh)} km/h</span>}
            </p>
          </article>

          <article className="rounded-[20px] bg-gradient-to-br from-[#2a3cb8] to-[#1a2477] p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium">{H.bestTime}</h2>
              <button onClick={open} className="rounded-full bg-[#ffc229] px-4 py-1.5 text-sm font-semibold text-[#1d1a10] hover:brightness-105">
                {H.details}
              </button>
            </div>
            {best ? (
              <>
                <p className="mt-3 text-5xl font-semibold tabular-nums">{hhmm(hourOf(best.time))}</p>
                <p className="mt-2 text-sm text-[#d7ddff]">{H.bestAt(best.aqi!, c!.aqi)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#d7ddff]">{air ? H.bestNone : "…"}</p>
            )}
          </article>

          <div>{searchSlot}</div>

          <div className="flex items-center gap-3 text-sm text-[#c7cff0]">
            <span>{H.share}</span>
            <a aria-label="WhatsApp" href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm4.6 12.6c-.2.6-1.1 1.1-1.6 1.1-.4 0-.9.2-3-.6-2.5-1-4.1-3.6-4.2-3.8-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.8.9c.3.1.4.2.5.3 0 .1 0 .7-.2 1.3Z" /></svg>
            </a>
            <a aria-label="X" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L2 3h6.3l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" /></svg>
            </a>
            <button aria-label={H.share} onClick={nativeShare} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
            </button>
          </div>
        </div>

        {/* Globe */}
        <div className="relative -mx-6 h-[420px] sm:-mx-10 sm:h-[560px] lg:mx-0 lg:h-auto lg:min-h-[640px]">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:28px_100%]" aria-hidden="true" />
          <Globe handle={globe} variant="night" spin cities={cities} selected={selected} onSelect={(x) => setSelected(x.name)} mode={mode} lang={lang} callout={callout} />
          <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 rounded-xl sm:bottom-4 bg-[#141d45]/90 p-1 text-sm font-medium ring-1 ring-white/10 backdrop-blur" role="group" aria-label="View">
            {(["globe", "map"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide sm:px-3.5 sm:text-sm ${mode === m ? "bg-[#2a3cb8] text-white" : "text-[#9aa5cf] hover:text-white"}`}>
                {m === "globe" ? v.globe : v.map}
              </button>
            ))}
          </div>
          {city && (
            <p className="absolute bottom-16 left-4 hidden font-mono text-xs leading-5 text-[#9aa5cf] sm:block lg:bottom-5">
              X: {city.lon.toFixed(4)}
              <br />
              Y: {city.lat.toFixed(4)}
            </p>
          )}
          <div className="absolute right-4 top-4 flex items-center gap-2 text-sm sm:bottom-12 sm:top-auto">
            <span className="hidden text-[#c7cff0] sm:inline">Zoom</span>
            <button onClick={() => globe.current?.zoomIn()} aria-label={v.zoomIn} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-lg hover:bg-white/25">+</button>
            <button onClick={() => globe.current?.zoomOut()} aria-label={v.zoomOut} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-lg hover:bg-white/25">−</button>
            <button onClick={() => globe.current?.reset()} aria-label={v.reset} className="grid h-8 w-8 place-items-center rounded-full bg-white/15 hover:bg-white/25">⟲</button>
          </div>
        </div>
      </div>
    </section>
  );
}
