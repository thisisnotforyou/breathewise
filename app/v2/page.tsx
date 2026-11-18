"use client";
// Version 2 ("Explorer"): light, minimal dashboard. The selected city's 3D landmark miniature
// sits beside the key statistics, and a light 3D globe shows live AQI across 15 Indian cities.
// Same data, planner and AI back end as version 1 (see lib/useBreatheWise.ts).
import { useCallback, useEffect, useRef, useState } from "react";
import { band } from "@/lib/aqi";
import { dominantPollutant } from "@/lib/pollutants";
import { compass, weatherEffect } from "@/lib/weather";
import { useBreatheWise } from "@/lib/useBreatheWise";
import { Globe, type GlobeHandle } from "@/components/Globe";
import { CityScene } from "@/components/CityScene";
import { AqiNow, Next24, Week } from "@/components/AirPanels";
import { DayForm } from "@/components/DayForm";
import { PlanView } from "@/components/PlanView";
import { Chat } from "@/components/Chat";
import { SearchBox } from "@/components/SearchBox";
import { SiteHeader } from "@/components/SiteHeader";
import type { CityReading } from "@/app/api/cities/route";

const fmt = (v: number | null | undefined, unit = "", digits = 0) => (v == null ? "—" : `${v.toFixed(digits)}${unit}`);
const ctrl = "grid h-9 w-9 place-items-center rounded-full bg-card/90 text-lg text-ink ring-1 ring-line backdrop-blur hover:ring-muted";

export default function ExplorerView() {
  const { t, lang, setLang, air, plan, prevPlan, planStale, loading, error, status, profile, saveProfile, buildPlan, loadCoords, search, query, setQuery, locate, pickSuggestion, searchContext } = useBreatheWise();
  const v = t.v2;
  const [cities, setCities] = useState<CityReading[]>([]);
  const [selected, setSelected] = useState("New Delhi");
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const globe = useRef<GlobeHandle>(null);
  const planRef = useRef<HTMLElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

  // City readings for the globe, then the default city's full forecast.
  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then((j) => j.cities && setCities(j.cities))
      .catch(() => {});
    loadCoords(28.6139, 77.209, "New Delhi");
    // Runs once when the page opens (loading the default city); later loads are user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = useCallback(
    (c: CityReading) => {
      setSelected(c.name);
      setQuery(c.name);
      loadCoords(c.lat, c.lon, c.name);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [loadCoords, setQuery]
  );

  const makePlan = async () => {
    if (await buildPlan()) requestAnimationFrame(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const c = air?.current;
  const b = band(c?.aqi);
  const worst = c ? dominantPollutant(c) : null;
  const w = air?.weather;
  const when = c ? new Date(c.time).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <div className="min-h-screen">
      <a href="#day" className="skip-link">
        {t.skip}
      </a>
      <div id="top" className="mx-auto max-w-7xl px-4 pb-28 pt-1 sm:px-6 sm:pt-3 md:pb-20">
        <SiteHeader lang={lang} setLang={setLang} withSections={!!air} altHref="/" altLabel={v.classic} />

        <p className="sr-only" aria-live="polite">{status}</p>

        {/* Hero: statistics left, 3D miniature right */}
        <section id="air" className="mt-6 scroll-mt-20 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">● {v.live}</p>
              <h1 className="font-display mt-2 text-6xl leading-none sm:text-7xl">
                {v.title1} <span className="text-muted">{v.title2}</span>
              </h1>
              <p className="mt-3 text-sm text-muted">
                {when} · <b className="font-medium text-ink">{air?.location.name ?? "…"}</b>
              </p>
            </div>

            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
              className="flex items-center gap-1 rounded-full bg-card p-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-accent"
            >
              <SearchBox value={query} onChange={setQuery} onPick={pickSuggestion} context={searchContext} placeholder={t.searchPh} noResults={t.noResults} inputClassName="px-3 py-2" />
              <button type="button" onClick={locate} disabled={!!loading} aria-label={t.myLocation} title={t.myLocation} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-bg hover:text-ink disabled:opacity-50">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></svg>
              </button>
              <button disabled={!!loading} className="rounded-full bg-ink px-5 py-2 font-medium text-bg disabled:opacity-50">{loading === "air" ? "…" : t.check}</button>
            </form>
            {error && <p role="alert" className="rounded-2xl bg-err-bg px-4 py-2.5 text-sm text-err-ink">{error}</p>}

            <article className="rounded-[24px] bg-card p-6 ring-1 ring-line">
              <h2 className="font-display text-2xl">{v.mainStats}</h2>
              <p className="mt-0.5 text-xs text-muted">{v.scale}</p>
              <div className="mt-3 flex items-end gap-4">
                <span className="font-display text-8xl leading-none tabular-nums">{c ? c.aqi : "—"}</span>
                <span className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} aria-hidden="true" />
                  {c ? b[lang] : ""}
                </span>
              </div>
              {c && <p className="mt-2 text-sm text-muted">{b.advice[lang]}</p>}
              {worst && (
                <p className="mt-4 border-t border-line pt-3 text-sm">
                  <span className="text-muted">{v.worst}: </span>
                  <b className="font-medium">{worst.label}</b> <span className="text-muted">· {v.times(worst.times.toFixed(1))}</span>
                </p>
              )}
            </article>

            <article className="rounded-[24px] bg-soft p-6 ring-1 ring-line">
              <h2 className="font-display text-2xl">{v.weather}</h2>
              {w ? (
                <>
                  <dl className="mt-3 grid grid-cols-4 gap-2">
                    {[
                      [v.temp, fmt(w.tempC, "°")],
                      [v.humidity, fmt(w.humidity, "%")],
                      [v.wind, `${fmt(w.windKmh)} ${compass(w.windDir)}`],
                      [v.rain, fmt(w.precipMm, " mm", 1)],
                    ].map(([k, val]) => (
                      <div key={k}>
                        <dt className="text-[11px] uppercase tracking-wider text-muted">{k}</dt>
                        <dd className="font-display mt-1 text-2xl tabular-nums">{val}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-sm">{weatherEffect(w)}</p>
                  <p className="mt-1 text-[11px] text-muted">km/h · Open-Meteo</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">—</p>
              )}
            </article>
          </div>

          {air ? <CityScene air={air} lang={lang} showAqi={false} className="h-[460px] sm:h-full sm:min-h-[600px]" /> : <div className="h-[460px] animate-pulse rounded-[28px] bg-[#e9e4da] sm:min-h-[600px]" />}
        </section>

        {/* Across India: light globe + city cards */}
        <section className="mt-14" aria-labelledby="monitors">
          <h2 id="monitors" className="font-display text-4xl">{v.across}</h2>
          <p className="mt-1 text-sm text-muted">{v.monitorsHint}</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative h-[420px] overflow-hidden rounded-[28px] bg-[#f1ede6] ring-1 ring-line sm:h-[520px]">
              <Globe handle={globe} cities={cities} selected={selected} onSelect={choose} mode={mode} lang={lang} />
              <p className="pointer-events-none absolute left-4 top-4 rounded-full bg-card/80 px-3 py-1 text-[11px] text-muted backdrop-blur">{v.legend}</p>
              <div className="absolute bottom-4 left-4 flex rounded-full bg-card/90 p-1 text-xs font-medium ring-1 ring-line backdrop-blur" role="group" aria-label="View">
                {(["globe", "map"] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-full px-3.5 py-1.5 ${mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
                    {m === "globe" ? v.globe : v.map}
                  </button>
                ))}
              </div>
              <div className="absolute right-4 top-4 flex flex-col gap-1.5">
                <button onClick={() => globe.current?.zoomIn()} aria-label={v.zoomIn} className={ctrl}>+</button>
                <button onClick={() => globe.current?.zoomOut()} aria-label={v.zoomOut} className={ctrl}>−</button>
                <button onClick={() => globe.current?.reset()} aria-label={v.reset} className={`${ctrl} text-base`}>⟲</button>
              </div>
            </div>
            <div className="grid grid-cols-2 content-start gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {cities.map((city) => {
                const cb = band(city.aqi);
                const on = city.name === selected;
                return (
                  <button key={city.name} onClick={() => choose(city)} aria-pressed={on} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left ring-1 transition ${on ? "bg-ink text-bg ring-ink" : "bg-card ring-line hover:ring-muted"}`}>
                    <span>
                      <span className="block text-sm font-medium">{lang === "hi" ? city.hi : city.name}</span>
                      <span className={`block text-[11px] ${on ? "text-bg/70" : "text-muted"}`}>{city.aqi == null ? "—" : cb[lang]}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: city.aqi == null ? "#bbb" : cb.color }} aria-hidden="true" />
                      <span className="font-display text-2xl tabular-nums">{city.aqi ?? "—"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {air && (
          <div className="mt-14 space-y-5">
            <div id="day" ref={dayRef} className="grid scroll-mt-20 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <DayForm profile={profile} onChange={saveProfile} lang={lang} onSubmit={makePlan} busy={loading === "plan"} hasPlan={!!plan} stale={planStale} />
              <div className="space-y-5">
                <Next24 air={air} lang={lang} />
                <AqiNow air={air} lang={lang} />
              </div>
            </div>
            <section id="plan" ref={planRef} className="scroll-mt-20" aria-busy={loading === "plan"}>
              {loading === "plan" && <p className="animate-pulse rounded-[24px] bg-card p-6 text-muted ring-1 ring-line">{t.planLoading}</p>}
              {!plan && loading !== "plan" && <p className="rounded-[24px] border border-dashed border-line p-6 text-center text-muted">{t.planEmpty}</p>}
              {plan && loading !== "plan" && <PlanView result={plan} previous={prevPlan} lang={lang} />}
            </section>
            <div id="ask" className="grid scroll-mt-20 gap-5 lg:grid-cols-2">
              <Chat key={`${air.location.lat},${air.location.lon}`} air={air} profile={profile} lang={lang} />
              <Week air={air} lang={lang} />
            </div>
          </div>
        )}

        <p className="mt-14 text-center text-xs text-muted">{t.disclaimer}</p>
      </div>
    </div>
  );
}
