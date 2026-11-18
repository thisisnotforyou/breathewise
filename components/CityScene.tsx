"use client";
// Hero scene for the searched city: its most famous landmark in 3D, either photo-real
// (Google Photorealistic 3D Tiles) or as a toy-like miniature with live traffic.
// A smog haze and drifting particles over the top follow the live AQI.
import { useMemo, useState } from "react";
import { band } from "@/lib/aqi";
import { dict } from "@/lib/i18n";
import { sceneFor, type Scene } from "@/lib/landmarks";
import { useNearbyLandmark } from "@/lib/useNearbyLandmark";
import type { AirData, Lang } from "@/lib/types";
import { MiniatureMap } from "./MiniatureMap";
import { PhotoRealMap } from "./PhotoRealMap";
import { SmogParticles } from "./SmogParticles";
import { useStoredString } from "@/lib/useStored";
import { CountUp } from "./CountUp";

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
type Mode = "photo" | "mini";

export function CityScene({ air, lang, showAqi = true, className = "" }: { air: AirData; lang: Lang; showAqi?: boolean; className?: string }) {
  const t = dict[lang];
  const { location: loc, current } = air;
  const baseScene = useMemo(() => sceneFor(loc.lat, loc.lon, loc.city), [loc.lat, loc.lon, loc.city]);
  // An exact pick (shop, address, locality, current location) centres on that spot with a pin;
  // a city search shows its famous landmark instead.
  const exactScene = useMemo<Scene | null>(
    () => (loc.exact ? { lat: loc.lat, lon: loc.lon, zoom: 17, scope: "exact", landmark: { name: loc.city, hi: loc.city, city: loc.city, lat: loc.lat, lon: loc.lon } } : null),
    [loc.exact, loc.lat, loc.lon, loc.city]
  );
  const nearby = useNearbyLandmark(baseScene.scope === "city" || loc.exact ? null : loc.lat, loc.lon, loc.city);
  const scene: Scene = exactScene ?? nearby ?? baseScene;
  const b = band(current.aqi);
  // 0 (clean) → 1 (hazardous): drives how thick the haze is.
  const smog = Math.min(1, Math.max(0, (current.aqi - 30) / 270));

  const [savedMode, saveMode] = useStoredString<Mode>("bw-scene-v2", "mini", ["mini", "photo"]);
  const mode: Mode = savedMode === "photo" && GOOGLE_KEY ? "photo" : "mini";
  const [photoError, setPhotoError] = useState("");
  const [credits, setCredits] = useState("");
  const [miniFailed, setMiniFailed] = useState(false);

  const choose = (m: Mode) => {
    saveMode(m);
    setPhotoError("");
  };

  const photo = mode === "photo" && GOOGLE_KEY && !photoError;
  const placeName = scene.landmark ? (lang === "hi" ? scene.landmark.hi : scene.landmark.name) : loc.city;
  const scopeLabel =
    scene.scope === "exact"
        ? [...loc.name.split(",").slice(1).map((x) => x.trim()), loc.region].filter((x, i, a) => x && a.indexOf(x) === i).join(", ") || loc.name
        : [loc.city, loc.region].filter(Boolean).join(", ");

  return (
    <section className={`relative overflow-hidden rounded-[28px] bg-[#e9e4da] ${className || "h-[460px] sm:h-[540px]"}`}>
      <div className="scene-canvas absolute inset-0">
        {photo ? (
          <PhotoRealMap key="photo" scene={scene} apiKey={GOOGLE_KEY} onCredits={setCredits} onError={(m) => setPhotoError(m)} />
        ) : (
          !miniFailed && <MiniatureMap key="mini" scene={scene} smog={smog} lang={lang} onError={() => setMiniFailed(true)} />
        )}
      </div>
      {/* Smog haze, thicker as AQI rises */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(233,228,218,${photo ? 0.3 + smog * 0.25 : 0.55 + smog * 0.4}) 0%, rgba(214,206,192,${photo ? smog * 0.12 : 0.1 + smog * 0.3}) ${photo ? 28 : 40}%, transparent ${photo ? 45 : 65}%)` }} />
      <SmogParticles smog={smog} subtle={!!photo} />
      {/* Tilt-shift blur bands = miniature look */}
      <div className={`tilt tilt-top ${photo ? "tilt-soft" : ""}`} />
      <div className={`tilt tilt-bottom ${photo ? "tilt-soft" : ""}`} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col-reverse items-start justify-between gap-3 p-5 sm:flex-row sm:p-7">
        <div className="min-w-0">
          <p className={`truncate text-xs font-medium uppercase tracking-[0.2em] ${photo ? "text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,.45)]" : "text-[#3d3a35]/75"}`}>{scopeLabel}</p>
          <h2 className={`font-display mt-1 text-4xl leading-none sm:text-6xl ${photo ? "text-white [text-shadow:0_2px_18px_rgba(0,0,0,.45)]" : "text-[#22201c]"}`}>{placeName}</h2>
        </div>
        {GOOGLE_KEY && (
          <div className="pointer-events-auto flex shrink-0 rounded-full bg-white/70 p-1 text-xs shadow-sm backdrop-blur-md" role="group" aria-label={t.viewMode}>
            {(["mini", "photo"] as Mode[]).map((m) => (
              <button key={m} onClick={() => choose(m)} aria-pressed={mode === m} className={`rounded-full px-3 py-1.5 font-medium ${mode === m ? "bg-[#22201c] text-white" : "text-[#22201c]/70"}`}>
                {m === "photo" ? t.photoReal : t.miniature}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
        <div className={`rounded-2xl bg-white/75 px-5 py-4 text-[#22201c] shadow-sm backdrop-blur-md ${showAqi ? "" : "invisible"}`}>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-6xl leading-none tabular-nums"><CountUp value={current.aqi} /></span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              {b[lang]}
            </span>
          </div>
          <p className="mt-1 max-w-xs text-sm text-[#22201c]/70">{b.advice[lang]}</p>
        </div>
        <div className="pointer-events-none flex max-w-[60%] flex-col items-end gap-1.5 text-right">
          {photoError && mode === "photo" && <p className="rounded-full bg-white/70 px-3 py-1 text-xs text-[#22201c]/80 backdrop-blur">{t.photoUnavailable}</p>}
          <p className="hidden rounded-full bg-white/60 px-3 py-1 text-xs text-[#22201c]/70 backdrop-blur sm:block">US AQI · PM2.5 {current.pm25 == null ? "–" : Math.round(current.pm25)} µg/m³</p>
          {photo && (
            <p className="max-w-full truncate rounded-full bg-white/60 px-3 py-1 text-[10px] text-[#22201c]/70 backdrop-blur" title={credits}>
              <b className="font-semibold">Google</b>
              {credits ? ` · ${credits.split("; ").slice(0, 2).join(", ")}${credits.split("; ").length > 2 ? "…" : ""}` : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
