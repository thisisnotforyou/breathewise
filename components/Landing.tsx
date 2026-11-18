"use client";
// Homepage shown before a place is chosen. Everything here is live except the plan preview,
// which is clearly labelled as an example.
import { useEffect, useState, type ReactNode } from "react";
import { band } from "@/lib/aqi";
import { dict } from "@/lib/i18n";
import type { AirData, Lang } from "@/lib/types";
import type { CityReading } from "@/app/api/cities/route";
import { CityScene } from "./CityScene";
import { HeroShowcase } from "./HeroShowcase";
import { CountUp } from "./CountUp";
import { SmogParticles } from "./SmogParticles";
import { flag } from "@/lib/cities";

type Props = { lang: Lang; searchSlot: ReactNode; onSearch: (name: string) => void; onCity: (c: CityReading) => void; onCta: () => void; onLocate: () => void };

const QUICK = ["Delhi", "Mumbai", "Jaipur", "Lucknow", "Bengaluru"];

const ICONS = [
  // clock, pin, home, language
  <path key="c" d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />,
  <path key="p" d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  <path key="h" d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8Z" />,
  <path key="l" d="M4 5h9M8.5 3v2M6 5c.6 3.4 2.6 6 5.5 7.5M11 5c-.8 4-3.2 7-7 8.5M13 21l4-10 4 10M14.4 17.5h5.2" />,
];

export function Landing({ lang, searchSlot, onSearch, onCity, onCta, onLocate }: Props) {
  const t = dict[lang];
  const L = t.landing;
  const [preview, setPreview] = useState<AirData | null>(null);
  const [cities, setCities] = useState<CityReading[]>([]);

  useEffect(() => {
    fetch("/api/air?lat=28.6139&lon=77.209&name=New%20Delhi&region=Delhi")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setPreview(j))
      .catch(() => {});
    fetch("/api/cities?scope=world")
      .then((r) => r.json())
      .then((j) => j.cities && setCities(j.cities))
      .catch(() => {});
  }, []);

  const [scope, setScope] = useState<"india" | "world">("india");
  const all = cities.filter((c) => c.aqi != null && (scope === "world" || c.cc === "IN")).sort((a, b) => b.aqi! - a.aqi!);
  const ranked = all.slice(0, 15);
  const cleanestCity = all[all.length - 1];
  const india = cities.filter((c) => c.cc === "IN" && c.aqi != null);
  const indiaCount = india.length;
  const unhealthy = indiaCount ? india.filter((c) => c.aqi! > 150).length : null;
  const max = Math.max(200, ...ranked.map((c) => c.aqi!));
  const name = (c: CityReading) => `${c.cc !== "IN" ? flag(c.cc) + " " : ""}${lang === "hi" ? c.hi : c.name}`;

  return (
    <div className="space-y-24 pb-8">
      {/* Hero: dark showcase card with the live globe */}
      <HeroShowcase lang={lang} cities={cities} searchSlot={searchSlot} onOpen={onCity} />

      {/* Promise + live 3D miniature */}
      <section className="reveal grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-accent ring-1 ring-line">{L.eyebrow}</p>
          <h2 className="font-display mt-5 text-5xl leading-[1.02] sm:text-6xl">{t.tagline}</h2>
          <p className="mt-5 max-w-xl text-lg text-muted">{L.sub}</p>
          <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted">
            {t.tryCity}:
            {QUICK.map((c) => (
              <button key={c} onClick={() => onSearch(c)} className="rounded-full px-3 py-1 ring-1 ring-line transition hover:bg-card hover:text-ink">
                {c}
              </button>
            ))}
          </p>
        </div>
        <div className="relative">
          {preview ? (
            <CityScene air={preview} lang={lang} className="h-[420px] sm:h-[520px]" />
          ) : (
            <div className="h-[420px] animate-pulse rounded-[28px] bg-line sm:h-[520px]" />
          )}
          <span className="absolute -top-3 right-6 rounded-full bg-ink px-3 py-1 text-xs font-medium text-bg shadow-sm">● {L.liveNow}</span>
        </div>
      </section>

      {/* India right now */}
      <section className="reveal" aria-labelledby="india-now">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <h2 id="india-now" className="font-display text-4xl sm:text-5xl">{scope === "india" ? L.indiaNow : L.worldNow}</h2>
              <div className="flex rounded-full bg-card p-1 text-sm ring-1 ring-line" role="group" aria-label={`${L.scopeIndia} / ${L.scopeWorld}`}>
                {(["india", "world"] as const).map((x) => (
                  <button key={x} onClick={() => setScope(x)} aria-pressed={scope === x} className={`rounded-full px-3.5 py-1 transition ${scope === x ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
                    {x === "india" ? `🇮🇳 ${L.scopeIndia}` : `🌍 ${L.scopeWorld}`}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 max-w-xl text-muted">{scope === "india" ? L.indiaHint : L.worldHint}</p>
            {scope === "world" && all.length > ranked.length && <p className="mt-1 text-xs text-muted">{L.showing(ranked.length, all.length)}</p>}
          </div>
          {ranked.length > 1 && (
            <div className="flex gap-3 text-sm">
              {[
                [L.worst, ranked[0]],
                [L.cleanest, cleanestCity],
              ].map(([label, c]) => {
                const city = c as CityReading;
                return (
                  <button key={label as string} onClick={() => onCity(city)} className="rounded-2xl bg-card px-4 py-2.5 text-left ring-1 ring-line hover:ring-muted">
                    <span className="block text-xs text-muted">{label as string}</span>
                    <span className="font-medium">{name(city)}</span> <span className="font-display text-xl tabular-nums" style={{ color: band(city.aqi).color }}>{city.aqi}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(ranked.length ? ranked : Array.from({ length: 10 }, () => null)).map((c, i) =>
            c ? (
              <li key={c.name}>
                <button onClick={() => onCity(c)} className="lift group w-full rounded-2xl bg-card p-4 text-left ring-1 ring-line hover:ring-muted">
                  <span className="flex items-baseline justify-between">
                    <span className="text-sm font-medium">{name(c)}</span>
                    <span className="font-display text-3xl tabular-nums"><CountUp value={c.aqi} /></span>
                  </span>
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-bg" aria-hidden="true">
                    <span className="block h-full rounded-full" style={{ width: `${Math.max(6, (c.aqi! / max) * 100)}%`, background: band(c.aqi).color }} />
                  </span>
                  <span className="mt-2 block text-xs text-muted">{band(c.aqi)[lang]}</span>
                </button>
              </li>
            ) : (
              <li key={i} className="h-[104px] animate-pulse rounded-2xl bg-card ring-1 ring-line" />
            )
          )}
        </ul>
      </section>

      {/* How it works */}
      <section className="reveal grid items-center gap-10 lg:grid-cols-2" aria-labelledby="how">
        <div>
          <h2 id="how" className="font-display text-4xl sm:text-5xl">{L.howTitle}</h2>
          <ol className="mt-8 space-y-7">
            {L.steps.map((s, i) => (
              <li key={s.t} className="flex gap-5">
                <span className="font-display text-5xl leading-none text-accent/70">{i + 1}</span>
                <span>
                  <span className="block text-lg font-medium">{s.t}</span>
                  <span className="block text-muted">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <figure className="rounded-[28px] bg-card p-6 ring-1 ring-line sm:p-8" aria-label={L.sample}>
          <figcaption className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{L.sample}</figcaption>
          <p className="font-display mt-2 text-3xl leading-tight">{lang === "hi" ? "बाहर के काम दोपहर में, शाम को घर पर" : "Errands after school, walk after tuition"}</p>
          <ol className="relative mt-6 ml-1 border-l border-line pl-6">
            {[
              ["15:00", lang === "hi" ? "स्कूल से बच्चे लाना" : "School pickup", true, "#d9971a"],
              ["16:15", lang === "hi" ? "किराने का सामान, उसी रास्ते पर" : "Grocery run on the way back", false, "#d9971a"],
              ["18:00", lang === "hi" ? "ट्यूशन" : "Tuition", true, "#d0412f"],
              ["19:00", lang === "hi" ? "शाम की छोटी सैर, N95 के साथ" : "Short walk, N95 on", false, "#d9971a"],
              ["21:30", lang === "hi" ? "बेडरूम में प्यूरीफ़ायर चालू" : "Purifier on in the bedroom", false, "#3a9d5d"],
            ].map(([time, what, fixed, color]) => (
              <li key={time as string} className="relative mb-4 last:mb-0">
                <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card" style={{ background: color as string }} aria-hidden="true" />
                <span className="font-display mr-2 text-xl tabular-nums">{time as string}</span>
                <span className="font-medium">{what as string}</span>
                {fixed && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-bg">{t.fixed}</span>}
              </li>
            ))}
          </ol>
        </figure>
      </section>

      {/* Features */}
      <section className="reveal" aria-labelledby="features">
        <h2 id="features" className="font-display text-4xl sm:text-5xl">{L.featuresTitle}</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {L.features.map((f, i) => (
            <li key={f.t} className="lift rounded-[24px] bg-card p-6 ring-1 ring-line">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[i]}
              </svg>
              <p className="mt-4 text-lg font-medium">{f.t}</p>
              <p className="mt-1 text-sm text-muted">{f.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing call to action */}
      <section className="reveal showcase relative overflow-hidden rounded-[32px] px-6 py-14 sm:px-12 sm:py-20" aria-labelledby="cta-title">
        <SmogParticles smog={0.5} subtle />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#3a5bff]/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-[#2bc4e8]/20 blur-3xl" aria-hidden="true" />
        <div className="relative grid items-center gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            {unhealthy != null && (
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-[#d7ddff] ring-1 ring-white/10">
                <span className="h-2 w-2 rounded-full bg-[#ff6b5b]" aria-hidden="true" />
                {L.ctaStat(unhealthy, indiaCount)}
              </p>
            )}
            <h2 id="cta-title" className="font-display mt-5 text-5xl leading-[1.02] text-white sm:text-7xl">{L.ctaTitle}</h2>
            <p className="mt-4 max-w-xl text-lg text-[#c7cff0]">{L.ctaSub}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onCta} className="rounded-full bg-white px-7 py-3.5 font-medium text-[#0c1438] shadow-lg transition hover:-translate-y-0.5">
                {L.cta} →
              </button>
              <button onClick={onLocate} className="rounded-full px-6 py-3.5 font-medium text-white ring-1 ring-white/25 transition hover:bg-white/10">
                ◎ {t.myLocation}
              </button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#9aa5cf]">
              {L.trust.map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <span className="text-[#5ab8ff]" aria-hidden="true">✓</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          {/* Breathing guide: expands and contracts on a 4-second rhythm */}
          <div className="relative mx-auto grid h-64 w-64 place-items-center sm:h-72 sm:w-72" aria-hidden="true">
            <span className="breathe absolute inset-0 rounded-full bg-[#5ab8ff]/10 ring-1 ring-[#5ab8ff]/30" />
            <span className="breathe absolute inset-8 rounded-full bg-[#5ab8ff]/15 ring-1 ring-[#5ab8ff]/30 [animation-delay:150ms]" />
            <span className="breathe absolute inset-16 rounded-full bg-[#5ab8ff]/25 [animation-delay:300ms]" />
            <span className="breathe-label relative text-center text-sm font-medium tracking-wide text-white">
              <span className="in-label">{L.breatheIn}</span>
              <span className="out-label">{L.breatheOut}</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
