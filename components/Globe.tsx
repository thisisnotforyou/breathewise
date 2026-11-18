"use client";
// A real 3D Earth (MapLibre globe projection) in a light, minimal style (OpenFreeMap Positron),
// with live AQI markers at each city's true coordinates. Drag to rotate, buttons to zoom/reset,
// toggle to a flat "Air map". Markers are buttons, so they work with the keyboard too.
import { useEffect, useImperativeHandle, useRef, useState, useLayoutEffect, type Ref } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isTouch } from "@/lib/touch";
import { band } from "@/lib/aqi";
import type { Lang } from "@/lib/types";
import type { CityReading } from "@/app/api/cities/route";

export type GlobeHandle = { zoomIn: () => void; zoomOut: () => void; reset: () => void };
/** Details shown in a card pinned to the selected city (all from live data). */
export type GlobeCallout = { title: string; aqi: number; category: string; color: string; facts: string[]; actionLabel?: string; onAction?: () => void };
type Props = {
  cities: CityReading[];
  selected: string;
  onSelect: (c: CityReading) => void;
  mode: "globe" | "map";
  lang: Lang;
  handle: Ref<GlobeHandle>;
  /** light = minimal grey globe; night = NASA Black Marble night lights with a blue atmosphere. */
  variant?: "light" | "night";
  callout?: GlobeCallout | null;
  /** Slowly rotate until the user touches the globe. */
  spin?: boolean;
};

/** Starting view: the whole Earth (night hero) or India (light Explorer globe). */
const homeView = (variant: "light" | "night") =>
  variant === "night" ? { center: [80, 18] as [number, number], zoom: 2.15 } : { center: [80, 22] as [number, number], zoom: 3.05 };

const NIGHT_TILES = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png";

export function Globe({ cities, selected, onSelect, mode, lang, handle, variant = "light", callout, spin = false }: Props) {
  const HOME = homeView(variant);
  const popup = useRef<import("maplibre-gl").Popup | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markers = useRef<import("maplibre-gl").Marker[]>([]);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const stopSpin = useRef<() => void>(() => {});
  const onSelectRef = useRef(onSelect);
  const citiesRef = useRef(cities);
  // Keep the latest props available to map event handlers (updated after each render).
  useLayoutEffect(() => {
    citiesRef.current = cities;
    onSelectRef.current = onSelect;
  });

  useImperativeHandle(handle, () => ({
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    reset: () => mapRef.current?.flyTo({ ...HOME, bearing: 0, pitch: 0 }),
  }));

  // Create the globe once.
  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl")
      .then((lib) => {
        if (cancelled || !el.current) return;
        ml.current = lib;
        const night = variant === "night";
        const map = new lib.Map({
          container: el.current,
          style: night
            ? {
                version: 8,
                projection: { type: "globe" },
                glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
                sources: { night: { type: "raster", tiles: [NIGHT_TILES], tileSize: 256, maxzoom: 8, attribution: "Imagery: NASA Black Marble (GIBS)" } },
                layers: [
                  { id: "ocean", type: "background", paint: { "background-color": "#14366e" } },
                  { id: "earth", type: "raster", source: "night", paint: { "raster-contrast": 0.15, "raster-brightness-min": 0.12, "raster-saturation": 0.25 } },
                ],
                sky: { "sky-color": "#070c24", "horizon-color": "#4cc2ff", "fog-color": "#14366e", "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0] },
              }
            : "https://tiles.openfreemap.org/styles/positron",
          center: homeView(variant).center,
          zoom: homeView(variant).zoom,
          attributionControl: { compact: true },
          renderWorldCopies: false,
          // On phones, one finger scrolls the page; two fingers move the map.
          cooperativeGestures: isTouch(),
        });
        // Minimal light globe: hide labels/icons, soft warm atmosphere.
        if (!night) map.once("style.load", () => {
          map.setProjection({ type: "globe" });
          for (const layer of map.getStyle().layers ?? []) {
            if (layer.type === "symbol") map.setLayoutProperty(layer.id, "visibility", "none");
          }
          map.setSky({
            "sky-color": "#f6f3ee",
            "horizon-color": "#dfe9ee",
            "fog-color": "#f6f3ee",
            "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.9, 5, 0.6, 7, 0],
          });
        });
        map.scrollZoom.disable();
        map.on("load", () => setReady(true));
        // Gentle spin until the user interacts (and never for reduced-motion users).
        if (spin && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          let raf = 0;
          const turn = () => {
            if (!map.isMoving()) map.setCenter([map.getCenter().lng + 0.03, map.getCenter().lat]);
            raf = requestAnimationFrame(turn);
          };
          map.once("load", () => (raf = requestAnimationFrame(turn)));
          const stop = () => cancelAnimationFrame(raf);
          ["mousedown", "touchstart", "wheel"].forEach((ev) => map.on(ev as "mousedown", stop));
          stopSpin.current = stop;
        }
        map.on("error", (e) => console.warn("[globe]", e.error?.message));
        mapRef.current = map;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      stopSpin.current();
      popup.current?.remove();
      markers.current.forEach((m) => m.remove());
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [variant, spin]);

  // Globe ↔ flat map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setProjection({ type: mode === "globe" ? "globe" : "mercator" });
    map.flyTo(mode === "globe" ? homeView(variant) : { center: [80, 22], zoom: 3.6 });
  }, [mode, ready, variant]);

  // Cities are drawn as map layers (not HTML markers): small glowing dots sized by zoom, and AQI
  // numbers that the map only shows where they don't collide (most polluted first). Dots on the
  // far side of the globe are hidden by the renderer. Only the selected city gets an HTML marker.
  useEffect(() => {
    const map = mapRef.current;
    const lib = ml.current;
    if (!map || !lib || !ready) return;
    const night = variant === "night";
    const data = {
      type: "FeatureCollection" as const,
      features: cities.map((c) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lon, c.lat] },
        properties: { name: c.name, label: lang === "hi" ? c.hi : c.name, aqi: c.aqi ?? -1, txt: c.aqi == null ? "" : String(c.aqi), color: c.aqi == null ? "#7b86a8" : band(c.aqi).color },
      })),
    };
    const src = map.getSource("cities") as import("maplibre-gl").GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource("cities", { type: "geojson", data });
      const r = (a: number, b: number, c: number) => ["interpolate", ["linear"], ["zoom"], 1.5, a, 3, b, 6, c] as unknown as number;
      map.addLayer({ id: "city-glow", type: "circle", source: "cities", paint: { "circle-color": ["get", "color"], "circle-radius": r(10, 14, 24), "circle-blur": 1, "circle-opacity": night ? 0.7 : 0.35 } });
      map.addLayer({
        id: "city-dot",
        type: "circle",
        source: "cities",
        paint: { "circle-color": ["get", "color"], "circle-radius": r(4.2, 6, 10), "circle-stroke-color": night ? "rgba(255,255,255,0.85)" : "#fffdf9", "circle-stroke-width": 1.2 },
      });
      map.addLayer({
        id: "city-label",
        type: "symbol",
        source: "cities",
        layout: {
          // World view: just the number. Country view (zoom ≥ 3): number + city name.
          "text-field": [
            "step",
            ["zoom"],
            ["get", "txt"],
            3,
            ["format", ["get", "txt"], { "font-scale": 1 }, "\n", {}, ["get", "label"], { "font-scale": 0.78, "text-font": ["literal", ["Noto Sans Regular"]] }],
          ] as unknown as string,
          "text-font": ["Noto Sans Bold"],
          "text-size": r(10, 12, 13.5),
          "text-line-height": 1.05,
          // Try above, below, right, left (and diagonals) before giving up on a label.
          "text-variable-anchor": ["bottom", "top", "left", "right", "bottom-left", "bottom-right", "top-left", "top-right"],
          "text-radial-offset": 0.85,
          "text-justify": "auto",
          "text-allow-overlap": false,
          "text-padding": 2,
          "symbol-sort-key": ["-", 0, ["get", "aqi"]], // most polluted wins label space
        },
        paint: { "text-color": night ? "#ffffff" : "#22201c", "text-halo-color": night ? "rgba(7,12,36,0.85)" : "rgba(255,253,249,0.9)", "text-halo-width": 1.4 },
      });
      // Hover: name + AQI. Click: select.
      const hover = new lib.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "globe-hover" });
      map.on("mouseenter", "city-dot", (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as { label: string; aqi: number };
        hover.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setText(`${p.label} · ${p.aqi < 0 ? "—" : `AQI ${p.aqi}`}`).addTo(map);
      });
      map.on("mouseleave", "city-dot", () => {
        map.getCanvas().style.cursor = "";
        hover.remove();
      });
      map.on("click", "city-dot", (e) => {
        const name = (e.features?.[0]?.properties as { name?: string })?.name;
        const c = citiesRef.current.find((x) => x.name === name);
        if (!c) return;
        stopSpin.current();
        hover.remove();
        onSelectRef.current(c);
      });
    }

    if (map.getLayer("city-label")) map.setFilter("city-label", ["!=", ["get", "name"], selected]);

    // The selected city: one prominent ring with its number.
    markers.current.forEach((m) => m.remove());
    const sel = cities.find((c) => c.name === selected);
    if (sel) {
      const b = band(sel.aqi);
      const ring = document.createElement("div");
      ring.className = "globe-pin is-selected";
      ring.style.setProperty("--pin", sel.aqi == null ? "#5b6b85" : b.color);
      ring.setAttribute("aria-hidden", "true");
      ring.textContent = sel.aqi == null ? "–" : String(sel.aqi);
      markers.current = [new lib.Marker({ element: ring }).setLngLat([sel.lon, sel.lat]).addTo(map)];
    } else markers.current = [];
  }, [cities, selected, lang, ready, variant]);

  // Fly to the selected city (not on first load, so the whole globe is visible at the start).
  const firstSelection = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    const c = cities.find((x) => x.name === selected);
    if (!map || !ready || !c) return;
    if (firstSelection.current) {
      firstSelection.current = false;
      return;
    }
    stopSpin.current();
    map.flyTo({ center: [c.lon, c.lat - 2], zoom: Math.max(map.getZoom(), mode === "globe" ? 3.4 : 4.4), duration: 1400 });
  }, [selected, ready, cities, mode]);

  // Callout card pinned to the selected city.
  useEffect(() => {
    const map = mapRef.current;
    const lib = ml.current;
    popup.current?.remove();
    const c = cities.find((x) => x.name === selected);
    if (!map || !lib || !ready || !c || !callout) return;
    const card = document.createElement("div");
    card.className = "globe-callout";
    const head = document.createElement("p");
    head.className = "globe-callout-head";
    head.textContent = callout.title;
    const body = document.createElement("div");
    body.className = "globe-callout-body";
    const badge = document.createElement("span");
    badge.className = "globe-callout-badge";
    badge.style.background = callout.color;
    badge.textContent = String(callout.aqi);
    const small = document.createElement("small");
    small.textContent = "US AQI";
    badge.append(small);
    const cat = document.createElement("strong");
    cat.textContent = callout.category;
    body.append(badge, cat);
    const facts = document.createElement("p");
    facts.className = "globe-callout-facts";
    facts.textContent = callout.facts.filter(Boolean).join("  ·  ");
    card.append(head, body, facts);
    if (callout.actionLabel && callout.onAction) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "globe-callout-action";
      btn.textContent = callout.actionLabel;
      btn.addEventListener("click", callout.onAction);
      card.append(btn);
    }
    popup.current = new lib.Popup({ closeButton: false, closeOnClick: false, anchor: "left", offset: 26, className: "globe-popup", maxWidth: "280px" })
      .setLngLat([c.lon, c.lat])
      .setDOMContent(card)
      .addTo(map);
  }, [callout, selected, cities, ready]);

  if (failed) return <p className="p-6 text-sm text-muted">3D view unavailable on this device.</p>;
  return (
    <div className="relative h-full w-full">
      <div ref={el} className={`h-full w-full ${variant === "night" ? "globe-night" : ""}`} />
      {/* Keyboard / screen-reader access to the cities drawn on the globe */}
      <ul className="sr-only">
        {cities.map((c) => (
          <li key={c.name}>
            <button type="button" aria-pressed={c.name === selected} onClick={() => onSelectRef.current(c)}>
              {(lang === "hi" ? c.hi : c.name) + (c.aqi == null ? ": no reading" : `: US AQI ${c.aqi}, ${band(c.aqi)[lang]}`)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
