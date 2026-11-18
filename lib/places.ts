// Place search helpers: turning provider responses into search suggestions, and short area names.
export type Suggestion = {
  label: string; // main line, e.g. "Lajpat Nagar"
  sub: string; // second line, e.g. "South Delhi, Delhi · 110024"
  /** place = city/town; spot = exact address, shop, building or locality; pin = PIN-code area. */
  kind: "place" | "pin" | "spot";
  lat?: number;
  lon?: number;
  region?: string;
  /** Address to look up when coordinates are not known yet (PIN code areas). */
  resolve?: string;
  /** Neighbourhood / city used to build a short display name ("Select Citywalk, Saket"). */
  area?: string;
  /** Google Places id, resolved to coordinates on pick. */
  placeId?: string;
};

export const isPin = (q: string) => /^\s*\d{6}\s*$/.test(q);

type OpenMeteoPlace = { name: string; latitude: number; longitude: number; admin1?: string; admin2?: string; country?: string };

export function fromOpenMeteo(results: OpenMeteoPlace[] = []): Suggestion[] {
  return results.map((r) => ({
    kind: "place",
    label: r.name,
    sub: [r.admin2 && r.admin2 !== r.name ? r.admin2 : "", r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
    region: r.admin1,
    area: r.admin1,
  }));
}

type PostOffice = { Name: string; District: string; State: string };

/** India Post offices for a PIN → one suggestion per distinct area name. */
export function fromPostOffices(pin: string, offices: PostOffice[] = []): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const o of offices) {
    const name = o.Name.replace(/\s*\(.*?\)\s*/g, " ").replace(/\b(S\.?O|B\.?O|H\.?O)\b\.?$/i, "").trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({ kind: "pin", label: name, sub: `${o.District}, ${o.State} · ${pin}`, region: o.State, area: o.District, resolve: `${name}, ${o.District}, ${o.State}, India` });
  }
  return out.slice(0, 8);
}

type OsmAddress = Partial<Record<"quarter" | "suburb" | "neighbourhood" | "village" | "town" | "city" | "city_district" | "state_district" | "county" | "state", string>>;

/** Short "Area, City" name for a reverse-geocoded point. */
export function areaName(a: OsmAddress = {}): { name: string; region?: string } {
  const area = a.quarter || a.suburb || a.neighbourhood || a.village || a.town;
  const city = a.city || a.town || a.state_district || a.county;
  const name = [area, city !== area ? city : ""].filter(Boolean).join(", ");
  return { name: name || a.state || "", region: a.state };
}

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Partial<Record<"name" | "osm_key" | "osm_value" | "street" | "housenumber" | "locality" | "district" | "city" | "county" | "state" | "postcode" | "country" | "countrycode", string>>;
};

const BROAD = new Set(["city", "town", "village", "state", "county", "district", "country", "municipality", "region", "province"]);
const TYPE_LABEL: Record<string, string> = { mall: "Mall", retail: "Shopping", department_store: "Store", supermarket: "Supermarket", restaurant: "Restaurant", cafe: "Café", hospital: "Hospital", school: "School", college: "College", university: "University", station: "Station", park: "Park", attraction: "Attraction", suburb: "Area", neighbourhood: "Area", residential: "Area", commercial: "Market area", hotel: "Hotel", office: "Office", place_of_worship: "Place of worship", stadium: "Stadium" };

/** Photon (OpenStreetMap) results → suggestions. Cities stay "place"; everything finer is an exact "spot". */
export function fromPhoton(features: PhotonFeature[] = []): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const f of features) {
    const p = f.properties;
    const label = p.name || [p.housenumber, p.street].filter(Boolean).join(" ");
    if (!label) continue;
    const broad = BROAD.has(p.osm_value || "");
    const type = TYPE_LABEL[p.osm_value || ""];
    const where = [p.street && p.street !== label ? p.street : "", p.locality || p.district, p.city !== label ? p.city : "", p.state, p.postcode].filter(Boolean);
    const sub = [type, [...new Set(where)].join(", ") || p.country].filter(Boolean).join(" · ");
    const key = `${label}|${sub}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: broad ? "place" : "spot", label, sub, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], region: p.state, area: [p.locality || p.district, p.city].find((x) => x && x !== label) || p.state });
  }
  return out.slice(0, 7);
}
