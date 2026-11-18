// Tiny 3D cars driving along the real road network of the map tiles.
// Roads come from OpenMapTiles' "transportation" layer; cars are fill-extrusion boxes
// re-positioned every frame. Everything runs in a local metre grid around the scene centre.
import type { Map as MlMap, GeoJSONSource } from "maplibre-gl";

type Path = { pts: [number, number][]; cum: number[]; len: number; speed: number; cls: string };
type Car = { path: Path; d: number; dir: 1 | -1; color: string; size: number };

const SPEED: Record<string, number> = { motorway: 16, trunk: 14, primary: 12, secondary: 10, tertiary: 9, minor: 6 };
const WEIGHT: Record<string, number> = { motorway: 6, trunk: 5, primary: 5, secondary: 3, tertiary: 2, minor: 1 };
const COLORS = ["#d8432f", "#f2b705", "#f2b705", "#1f5fa8", "#22201c", "#2e8b6e", "#ffffff", "#e26d3d", "#6b4ea0"];

export function startTraffic(map: MlMap, opts: { maxCars?: number; reduceMotion?: boolean } = {}): (() => void) | null {
  const c = map.getCenter();
  const lat0 = c.lat, lon0 = c.lng;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111320;
  const ky = 110540;
  const toM = (lon: number, lat: number): [number, number] => [(lon - lon0) * kx, (lat - lat0) * ky];
  const toLL = (x: number, y: number): [number, number] => [lon0 + x / kx, lat0 + y / ky];

  // 1. Collect drivable road paths near the centre.
  const paths: Path[] = [];
  const feats = map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation" });
  for (const f of feats) {
    const cls = String(f.properties?.class ?? "");
    if (!(cls in SPEED)) continue;
    const g = f.geometry;
    const lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    for (const line of lines) {
      const pts = (line as number[][]).map(([lon, lat]) => toM(lon, lat));
      if (pts.length < 2 || pts.every(([x, y]) => Math.hypot(x, y) > 900)) continue;
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const len = cum[cum.length - 1];
      if (len < 60) continue;
      paths.push({ pts, cum, len, speed: SPEED[cls], cls });
    }
  }
  if (paths.length < 5) return null; // road tiles not loaded yet

  // 2. Spawn cars, weighted towards big roads and longer segments.
  const weighted: Path[] = [];
  for (const p of paths) {
    const near = Math.min(...p.pts.map(([x, y]) => Math.hypot(x, y)));
    const closeness = near < 300 ? 3 : near < 600 ? 2 : 1; // crowd the streets around the landmark
    for (let i = 0; i < WEIGHT[p.cls] * closeness * Math.min(4, Math.ceil(p.len / 150)); i++) weighted.push(p);
  }
  const n = Math.min(opts.maxCars ?? 140, Math.max(30, Math.round(weighted.length * 0.6)));
  const pick = () => weighted[Math.floor(Math.random() * weighted.length)];
  const cars: Car[] = Array.from({ length: n }, () => {
    const path = pick();
    return { path, d: Math.random() * path.len, dir: Math.random() < 0.5 ? 1 : -1, color: COLORS[Math.floor(Math.random() * COLORS.length)], size: Math.random() < 0.12 ? 1.8 : 1 };
  });

  // 3. Layers: soft shadow + extruded body.
  const empty = { type: "FeatureCollection" as const, features: [] };
  if (!map.getSource("cars")) {
    map.addSource("cars", { type: "geojson", data: empty });
    map.addLayer({ id: "cars-shadow", type: "fill", source: "cars", paint: { "fill-color": "#000", "fill-opacity": 0.12, "fill-translate": [1.2, 1.2] } });
    map.addLayer({
      id: "cars-body",
      type: "fill-extrusion",
      source: "cars",
      paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-base": 0.3, "fill-extrusion-opacity": 1 },
    });
  }
  const src = map.getSource("cars") as GeoJSONSource;

  const at = (p: Path, d: number) => {
    let i = 1;
    while (i < p.cum.length - 1 && p.cum[i] < d) i++;
    const [x0, y0] = p.pts[i - 1], [x1, y1] = p.pts[i];
    const seg = p.cum[i] - p.cum[i - 1] || 1;
    const t = (d - p.cum[i - 1]) / seg;
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, ang: Math.atan2(y1 - y0, x1 - x0) };
  };

  // Miniature scale: cars are drawn ~2.5x real size so they read at city zoom (toy-model look).
  const L = 11, W = 5, H = 4, LANE = 4;
  const render = () => {
    const features = cars.map((car) => {
      const { x, y, ang } = at(car.path, car.d);
      const a = car.dir === 1 ? ang : ang + Math.PI;
      const cos = Math.cos(a), sin = Math.sin(a);
      // keep to the left side of the road (Indian traffic), offset perpendicular to heading
      const cx = x - sin * LANE, cy = y + cos * LANE;
      const l = (L * car.size) / 2, w = (W * (car.size > 1 ? 1.15 : 1)) / 2;
      const corners = [[l, w], [-l, w], [-l, -w], [l, -w], [l, w]].map(([u, v]) => toLL(cx + u * cos - v * sin, cy + u * sin + v * cos));
      return { type: "Feature" as const, geometry: { type: "Polygon" as const, coordinates: [corners] }, properties: { color: car.size > 1 ? "#f2f0ea" : car.color, h: H * (car.size > 1 ? 1.6 : 1) } };
    });
    src.setData({ type: "FeatureCollection", features });
  };

  let raf = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const car of cars) {
      car.d += car.dir * car.path.speed * 0.55 * (car.size > 1 ? 0.7 : 1) * dt;
      if (car.d < 0 || car.d > car.path.len) {
        const p = pick();
        car.path = p;
        car.dir = Math.random() < 0.5 ? 1 : -1;
        car.d = car.dir === 1 ? 0 : p.len;
      }
    }
    render();
    raf = requestAnimationFrame(tick);
  };
  if (opts.reduceMotion) render();
  else raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
