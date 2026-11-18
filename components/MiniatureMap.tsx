"use client";
// Stylised "toy city" view: MapLibre + OpenFreeMap 3D buildings, slow orbit and live traffic.
import { useEffect, useLayoutEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isTouch } from "@/lib/touch";
import type { Scene } from "@/lib/landmarks";
import { startTraffic } from "@/lib/traffic";
import type { Lang } from "@/lib/types";

const STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function MiniatureMap({ scene, smog, lang, onError }: { scene: Scene; smog: number; lang: Lang; onError: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const errRef = useRef(onError);
  useLayoutEffect(() => {
    errRef.current = onError;
  });

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let frame = 0;
    let stopTraffic = () => {};
    let trafficTimer = 0;
    let cancelled = false;
    import("maplibre-gl")
      .then((ml) => {
        if (cancelled || !el.current) return;
        map = new ml.Map({
          container: el.current,
          style: STYLE,
          center: [scene.lon, scene.lat],
          zoom: scene.zoom,
          pitch: 70,
          maxPitch: 80,
          bearing: -20,
          attributionControl: { compact: true },
          canvasContextAttributes: { antialias: true },
          // On phones, one finger scrolls the page; two fingers move the map.
          cooperativeGestures: isTouch(),
        });
        map.scrollZoom.disable();
        map.on("error", (e) => console.warn("[scene]", e.error?.message));
        // "style.load" fires as soon as the style is parsed, before all tiles arrive, so labels never flash in.
        map.once("style.load", () => {
          if (!map) return;
          // Minimal: hide every icon and label; only our landmark pin remains.
          for (const layer of map.getStyle().layers ?? []) {
            if (layer.type === "symbol") map.setLayoutProperty(layer.id, "visibility", "none");
          }
          // Soft, toy-like buildings.
          if (map.getLayer("building-3d")) {
            map.setPaintProperty("building-3d", "fill-extrusion-color", ["interpolate", ["linear"], ["get", "render_height"], 0, "#efe9df", 40, "#e3dacb", 120, "#d6cab6"]);
            map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.95);
          }
          // Warm, low sun so buildings and cars cast readable shading.
          map.setLight({ anchor: "map", position: [1.4, 215, 35], color: "#fff4e0", intensity: 0.45 });
          map.setSky({
            "sky-color": "#e9e4da",
            "horizon-color": "#e6dccd",
            "fog-color": "#c9c3b8",
            "sky-horizon-blend": 0.6,
            "horizon-fog-blend": 0.4 + smog * 0.5,
            "fog-ground-blend": 0.9 - smog * 0.6,
            "atmosphere-blend": 0.8,
          });
          if (scene.landmark) {
            const pin = document.createElement("div");
            pin.className = "scene-pin";
            pin.textContent = lang === "hi" ? scene.landmark.hi : scene.landmark.name;
            new ml.Marker({ element: pin, anchor: "bottom" }).setLngLat([scene.lon, scene.lat]).addTo(map);
          }
          // Gentle orbit until the user grabs the map.
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const spin = () => {
            if (!map || reduce) return;
            map.setBearing(map.getBearing() + 0.04);
            frame = requestAnimationFrame(spin);
          };
          spin();
          // Start traffic once the road tiles are loaded (the orbit keeps the map moving, so poll instead of "idle").
          let tries = 0;
          const tryTraffic = () => {
            if (!map || cancelled) return;
            const stopFn = startTraffic(map, { reduceMotion: reduce });
            if (stopFn) stopTraffic = stopFn;
            else if (++tries < 10) trafficTimer = window.setTimeout(tryTraffic, 800);
          };
          trafficTimer = window.setTimeout(tryTraffic, 800);
          const stop = () => cancelAnimationFrame(frame);
          map.on("mousedown", stop);
          map.on("touchstart", stop);
        });
      })
      .catch(() => errRef.current());
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stopTraffic();
      clearTimeout(trafficTimer);
      map?.remove();
    };
  }, [scene, lang, smog]);

  return <div ref={el} className="h-full w-full" />;
}
