// Optional Google Places (New) search — the same suggestions as Google Maps.
// Used only when GOOGLE_PLACES_API_KEY is set on the server (enable "Places API (New)" for it).
import type { Suggestion } from "./places";

const KEY = () => (process.env.GOOGLE_PLACES_API_KEY || "").trim();
export const hasGooglePlaces = () => !!KEY();

type Prediction = { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } };

export async function googleAutocomplete(input: string, sessionToken: string, bias?: { lat: number; lon: number }): Promise<Suggestion[]> {
  const r = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY() },
    body: JSON.stringify({
      input,
      sessionToken,
      languageCode: "en",
      ...(bias ? { locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lon }, radius: 50000 } } } : { includedRegionCodes: ["in"] }),
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Google Places ${r.status}`);
  return ((j.suggestions ?? []) as Prediction[])
    .filter((s) => s.placePrediction)
    .slice(0, 7)
    .map(({ placePrediction: p }) => ({
      kind: "spot" as const,
      label: p!.structuredFormat?.mainText?.text || p!.text?.text || "",
      sub: p!.structuredFormat?.secondaryText?.text || "",
      area: (p!.structuredFormat?.secondaryText?.text || "").split(",")[0].trim(),
      placeId: p!.placeId,
    }));
}

export async function googlePlaceDetails(placeId: string, sessionToken: string) {
  const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`, {
    headers: { "X-Goog-Api-Key": KEY(), "X-Goog-FieldMask": "location,displayName,addressComponents,types" },
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || `Google Places ${r.status}`);
  const state = (j.addressComponents ?? []).find((c: { types: string[] }) => c.types.includes("administrative_area_level_1"))?.longText;
  const broad = (j.types ?? []).some((t: string) => ["locality", "administrative_area_level_1", "administrative_area_level_2", "country"].includes(t));
  return { lat: j.location.latitude as number, lon: j.location.longitude as number, name: j.displayName?.text as string, region: state as string | undefined, exact: !broad };
}
