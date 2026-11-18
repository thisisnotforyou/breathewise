"use client";
import { useRef, useState } from "react";
import { band, hhmm, hourOf } from "@/lib/aqi";
import { dict } from "@/lib/i18n";
import type { AirData, Lang } from "@/lib/types";
import { Card } from "./Card";

export function AqiNow({ air, lang }: { air: AirData; lang: Lang }) {
  const t = dict[lang];
  const c = air.current;
  const pol: [string, number | null, string][] = [
    ["PM2.5", c.pm25, t.polDesc.pm25],
    ["PM10", c.pm10, t.polDesc.pm10],
    ["NO₂", c.no2, t.polDesc.no2],
    ["O₃", c.o3, t.polDesc.o3],
    ["SO₂", c.so2, t.polDesc.so2],
    ["CO", c.co, t.polDesc.co],
  ];
  return (
    <section aria-label="Pollutants" className="grid grid-cols-2 gap-px overflow-hidden rounded-[24px] bg-line ring-1 ring-line sm:grid-cols-3">
      {pol.map(([n, v, d]) => (
        <div key={n} className="bg-card px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-[0.15em] text-muted">{n}</div>
          <div className="font-display mt-1 text-3xl tabular-nums">{v == null ? "–" : Math.round(v)}</div>
          <div className="text-xs text-muted">{d}</div>
        </div>
      ))}
    </section>
  );
}

export function Next24({ air, lang }: { air: AirData; lang: Lang }) {
  const t = dict[lang];
  const hours = air.hours;
  const max = Math.max(60, ...hours.map((h) => h.aqi ?? 0));
  const clean = new Set(air.cleanWindows.map((h) => h.time));
  const [i, setI] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const sel = i == null ? null : hours[i];

  // Pointer (mouse, pen or touch-drag) → nearest hour.
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !hours.length) return;
    setI(Math.min(hours.length - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * hours.length))));
  };

  return (
    <Card title={t.next24} hint={t.next24Hint}>
      <div className="relative">
        {sel && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-3 py-1.5 text-xs text-bg shadow-lg"
            style={{ left: `${((i! + 0.5) / hours.length) * 100}%` }}
          >
            <b className="font-display text-base tabular-nums">{hhmm(hourOf(sel.time))}</b> · AQI {sel.aqi ?? "—"} · {band(sel.aqi)[lang]}
            {clean.has(sel.time) && " 🌿"}
          </div>
        )}
        <div
          ref={box}
          tabIndex={0}
          role="slider"
          aria-label={t.next24}
          aria-valuemin={0}
          aria-valuemax={hours.length - 1}
          aria-valuenow={i ?? 0}
          aria-valuetext={sel ? `${hhmm(hourOf(sel.time))}, AQI ${sel.aqi ?? "unknown"}, ${band(sel.aqi)[lang]}` : t.next24Hint}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setI(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setI((x) => Math.min(hours.length - 1, (x ?? -1) + 1));
            else if (e.key === "ArrowLeft") setI((x) => Math.max(0, (x ?? 1) - 1));
            else if (e.key === "Escape") setI(null);
            else return;
            e.preventDefault();
          }}
          onBlur={() => setI(null)}
          className="flex h-36 cursor-crosshair touch-pan-y items-end gap-0.5 rounded-lg outline-offset-4"
        >
          {hours.map((h, k) => (
            <div key={h.time} className="relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm transition-[height,opacity] duration-500"
                style={{ height: `${Math.max(3, ((h.aqi ?? 0) / max) * 100)}%`, background: band(h.aqi).color, opacity: i == null || i === k ? 1 : 0.45 }}
              />
              {clean.has(h.time) && <span className="absolute -bottom-4 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex justify-between text-xs text-muted">
        {[0, 6, 12, 18, 23].map((k) => hours[k] && <span key={k}>{k === 0 ? t.today : hhmm(hourOf(hours[k].time))}</span>)}
      </div>
      {air.cleanWindows.length > 0 && (
        <p className="mt-3 text-sm">
          🌿 <b>{t.cleanest}:</b> {air.cleanWindows.map((h) => `${hhmm(hourOf(h.time))} (${h.aqi})`).join(" · ")}
        </p>
      )}
    </Card>
  );
}

export function Week({ air, lang }: { air: AirData; lang: Lang }) {
  const t = dict[lang];
  const max = Math.max(60, ...air.days.map((d) => d.max));
  const fmt = new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric" });
  return (
    <Card title={t.week}>
      <div className="space-y-2">
        {air.days.map((d, i) => (
          <div key={d.date} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted">{i === 0 ? t.today : fmt.format(new Date(d.date + "T12:00:00"))}</span>
            <div className="relative h-5 flex-1 rounded-full bg-line/50">
              <div
                className="absolute h-5 rounded-full opacity-90"
                style={{ left: `${(d.min / max) * 100}%`, width: `${Math.max(2, ((d.max - d.min) / max) * 100)}%`, background: `linear-gradient(90deg, ${band(d.min).color}, ${band(d.max).color})` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums">
              <b style={{ color: band(d.avg).color }}>{d.avg}</b> <span className="text-xs text-muted">avg</span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
