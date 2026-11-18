"use client";
// Google Photorealistic 3D Tiles rendered with deck.gl, slowly orbiting the landmark.
// Needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY with the Map Tiles API enabled.
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Scene } from "@/lib/landmarks";
import { isTouch } from "@/lib/touch";

const ROOT = "https://tile.googleapis.com/v1/3dtiles/root.json";

type ViewState = { longitude: number; latitude: number; zoom: number; pitch: number; bearing: number; maxPitch: number; position: number[] };
type TileLike = { content?: { gltf?: { asset?: { copyright?: string } } } };

export function PhotoRealMap({ scene, apiKey, onError, onCredits }: { scene: Scene; apiKey: string; onError: (msg: string) => void; onCredits: (c: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef({ onError, onCredits });
  useLayoutEffect(() => {
    cb.current = { onError, onCredits };
  });

  useEffect(() => {
    let deck: import("@deck.gl/core").Deck | undefined;
    let raf = 0;
    let cancelled = false;
    let failed = false;
    const fail = (msg: string) => {
      if (failed || cancelled) return;
      failed = true;
      cb.current.onError(msg);
    };

    (async () => {
      const [{ Deck }, { Tile3DLayer }] = await Promise.all([import("@deck.gl/core"), import("@deck.gl/geo-layers")]);
      // Orbit around ground level rather than sea level (the tiles include real terrain).
      let ground = 0;
      try {
        const j = await (await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${scene.lat}&longitude=${scene.lon}`)).json();
        ground = Number(j.elevation?.[0]) || 0;
      } catch {}
      if (cancelled || !ref.current) return;

      let view: ViewState = { longitude: scene.lon, latitude: scene.lat, zoom: scene.zoom + 0.5, pitch: 58, bearing: -20, maxPitch: 85, position: [0, 0, ground] };
      let userControl = false;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const layer = new Tile3DLayer({
        id: "google-3d-tiles",
        data: ROOT,
        loadOptions: {
          // Custom fetch: adds the key header and surfaces a rejected key (403 etc.) so we can fall back.
          fetch: async (url: string, init?: RequestInit) => {
            const res = await fetch(url, { ...init, headers: { ...(init?.headers || {}), "X-GOOG-API-KEY": apiKey } });
            if (!res.ok && url.includes("root.json")) {
              const msg = await res.clone().json().then((j) => j?.error?.message).catch(() => "");
              fail(msg || `Google 3D tiles: HTTP ${res.status}`);
            }
            return res;
          },
        },
        onTilesetLoad: (tileset: unknown) => {
          // Google requires showing the data providers of the tiles on screen.
          const ts = tileset as { options: { onTraversalComplete?: (sel: TileLike[]) => TileLike[] } };
          ts.options.onTraversalComplete = (selected) => {
            const credits = new Set<string>();
            for (const t of selected) t.content?.gltf?.asset?.copyright?.split(";").forEach((c) => c.trim() && credits.add(c.trim()));
            cb.current.onCredits([...credits].join("; "));
            return selected;
          };
        },
        onTileError: (_tile: unknown, _url: string, message: string) => console.warn("[photoreal] tile", message),
        onError: (e: Error) => {
          fail(e.message || "Could not load Google 3D tiles");
          return true;
        },
      });

      deck = new Deck({
        parent: ref.current,
        viewState: view,
        // On phones, leave touch to page scrolling; the view still orbits on its own.
        controller: isTouch() ? false : { touchRotate: true, inertia: 300, scrollZoom: false },
        layers: [layer],
        onViewStateChange: ({ viewState, interactionState }) => {
          if (interactionState?.isDragging || interactionState?.isRotating || interactionState?.isZooming) userControl = true;
          view = viewState as ViewState;
          deck?.setProps({ viewState: view });
        },
        onError: (e) => fail(e.message),
      });

      const spin = () => {
        if (!userControl && deck) {
          view = { ...view, bearing: view.bearing + 0.05 };
          deck.setProps({ viewState: view });
        }
        raf = requestAnimationFrame(spin);
      };
      if (!reduce) raf = requestAnimationFrame(spin);
    })().catch((e) => fail(String(e?.message ?? e)));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      deck?.finalize();
    };
  }, [scene, apiKey]);

  return <div ref={ref} className="relative h-full w-full" />;
}
