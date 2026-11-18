"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { isTouch } from "@/lib/touch";
import { band } from "@/lib/aqi";
import { dict } from "@/lib/i18n";
import type { AirData, Lang } from "@/lib/types";
import { Card } from "./Card";

export function HotspotMap({ air, lang }: { air: AirData; lang: Lang }) {
  const el = useRef<HTMLDivElement>(null);
  const t = dict[lang];

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    import("maplibre-gl").then((ml) => {
      if (cancelled || !el.current) return;
      const stations = air.hotspotSource === "stations";
      map = new ml.Map({
        container: el.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [air.location.lon, air.location.lat],
        zoom: stations ? 10.5 : 8.6,
        attributionControl: { compact: true },
        cooperativeGestures: isTouch(),
      });
      map.scrollZoom.disable();
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (!map) return;
        map.addSource("hot", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: air.hotspots.map((h) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [h.lon, h.lat] },
              properties: { aqi: Math.round(h.aqi), color: band(h.aqi).color, label: `${h.name ? h.name + " — " : ""}AQI ${Math.round(h.aqi)} (${band(h.aqi)[lang]})` },
            })),
          },
        });
        // Soft glow underneath, crisp dot on top.
        map.addLayer({ id: "hot-glow", type: "circle", source: "hot", paint: { "circle-color": ["get", "color"], "circle-radius": stations ? 26 : ["interpolate", ["exponential", 2], ["zoom"], 6, 18, 10, 120], "circle-blur": 1, "circle-opacity": 0.45 } });
        map.addLayer({ id: "hot-dot", type: "circle", source: "hot", paint: { "circle-color": ["get", "color"], "circle-radius": 6, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 } });
        map.addLayer({ id: "hot-num", type: "symbol", source: "hot", layout: { "text-field": ["to-string", ["get", "aqi"]], "text-size": 11, "text-offset": [0, 1.3], "text-font": ["Noto Sans Regular"] }, paint: { "text-color": "#22201c", "text-halo-color": "#fff", "text-halo-width": 1.2 } });
        new ml.Marker({ color: "#22201c", scale: 0.7 }).setLngLat([air.location.lon, air.location.lat]).addTo(map);
        map.on("click", "hot-dot", (e) => {
          const f = e.features?.[0];
          if (!f || !map) return;
          const div = document.createElement("div");
          div.textContent = String(f.properties?.label ?? "");
          new ml.Popup({ closeButton: false }).setLngLat(e.lngLat).setDOMContent(div).addTo(map);
        });
        if (stations && air.hotspots.length > 1) {
          const b = new ml.LngLatBounds();
          air.hotspots.forEach((h) => b.extend([h.lon, h.lat]));
          map.fitBounds(b, { padding: 30, duration: 0 });
        }
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [air, lang]);

  return (
    <Card title={t.map} hint={air.hotspotSource === "stations" ? t.mapStations : t.mapModel}>
      <div className="h-80 w-full overflow-hidden rounded-2xl">
        <div ref={el} className="h-full w-full" />
      </div>
    </Card>
  );
}
