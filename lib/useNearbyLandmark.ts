"use client";
// For places without a hand-picked landmark, asks /api/landmark (Wikipedia) for the most notable
// landmark nearby. Results are remembered per place for the visit; failures fall back silently.
import { useEffect, useState } from "react";
import type { Scene } from "./landmarks";

const memo = new Map<string, Scene | null>();

export function useNearbyLandmark(lat: number | null, lon: number, city: string): Scene | null {
  const key = lat == null ? "" : `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const [found, setFound] = useState<Record<string, Scene | null>>({});

  useEffect(() => {
    if (!key || lat == null || memo.has(key)) return;
    let cancelled = false;
    fetch(`/api/landmark?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((j) => {
        const l = j?.landmark;
        const scene: Scene | null = l ? { lat: l.lat, lon: l.lon, zoom: 16.6, scope: "nearby", landmark: { name: l.name, hi: l.hi, city, lat: l.lat, lon: l.lon } } : null;
        if (!j?.error) memo.set(key, scene); // don't remember temporary failures
        if (!cancelled) setFound((f) => ({ ...f, [key]: scene }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key, lat, lon, city]);

  if (!key) return null;
  return found[key] ?? memo.get(key) ?? null;
}
