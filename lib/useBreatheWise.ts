"use client";
// Shared state and actions for both versions of the interface (/ and /v2):
// language, household profile, air data, plan requests and their caching.
import { useEffect, useRef, useState } from "react";
import type { PlanResult } from "@/components/PlanView";
import { dict } from "./i18n";
import type { AirData, Lang, Profile } from "./types";
import { isPin, type Suggestion } from "./places";
import { useStoredJSON, useStoredString } from "./useStored";

const newSessionId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

export const DEFAULT_PROFILE: Profile = { members: 4, household: ["young children"], commute: "Car", home: "Apartment near a main road", notes: "", routine: "" };

export function useBreatheWise() {
  const [lang, setLang] = useStoredString<Lang>("bw-lang", "en", ["en", "hi"]);
  const [profile, saveProfile] = useStoredJSON<Profile>("bw-profile", DEFAULT_PROFILE);
  // The search box shows what you're typing; otherwise the last place you searched.
  const [savedQuery, saveQuery] = useStoredString<string>("bw-query", "Delhi");
  const [draft, setDraft] = useState<string | null>(null);
  const query = draft ?? savedQuery;
  const setQuery = (q: string) => setDraft(q);
  const rememberQuery = (q: string) => {
    setDraft(null);
    saveQuery(q);
  };
  const [air, setAir] = useState<AirData | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [prevPlan, setPrevPlan] = useState<PlanResult | null>(null);
  const [planFor, setPlanFor] = useState("");
  const [loading, setLoading] = useState<"" | "air" | "plan">("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState(""); // announced to screen readers
  const airCache = useRef(new Map<string, { at: number; data: AirData }>());
  const t = dict[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const signature = JSON.stringify([profile, lang]);
  const planStale = !!plan && planFor !== signature;

  async function buildPlan(): Promise<boolean> {
    if (!air) return false;
    setLoading("plan");
    setError("");
    setStatus(t.planLoading);
    try {
      const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ air, profile, lang }) });
      const j = await r.json();
      if (!j.plan) throw new Error(j.error || "Could not build a plan");
      setPrevPlan(plan);
      setPlan(j);
      setPlanFor(signature);
      setStatus(j.plan.headline);
      return true;
    } catch (e) {
      setError((e as Error).message === "Failed to fetch" ? "Network error while building the plan" : (e as Error).message);
      return false;
    } finally {
      setLoading("");
    }
  }

  async function fetchAir(params: string) {
    setError("");
    const hit = airCache.current.get(params);
    if (hit && Date.now() - hit.at < 10 * 60_000) {
      setAir(hit.data);
      setPlan(null);
      setPrevPlan(null);
      return;
    }
    setLoading("air");
    setStatus("…");
    try {
      const r = await fetch(`/api/air?${params}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load air data");
      airCache.current.set(params, { at: Date.now(), data: j });
      setAir(j);
      setPlan(null);
      setPrevPlan(null);
      setStatus(`${j.location.name}: AQI ${j.current.aqi}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  const loadCoords = (lat: number, lon: number, name: string, region?: string, exact = false) =>
    fetchAir(`lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&name=${encodeURIComponent(name)}${region ? `&region=${encodeURIComponent(region)}` : ""}${exact ? "&exact=1" : ""}`);

  // One Google Places "session" per search (typing + pick), as Google's billing expects.
  const [session, setSession] = useState(newSessionId);
  const newSession = () => setSession(newSessionId());

  /** A suggestion was picked: load it directly, or look up its exact spot first (PIN areas, Google places). */
  async function pickSuggestion(s: Suggestion) {
    const name = [s.label, s.area].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
    const exact = s.kind !== "place";
    rememberQuery(name);
    if (s.lat != null && s.lon != null) return loadCoords(s.lat, s.lon, name, s.region, exact);
    if (!s.resolve && !s.placeId) return;
    setLoading("air");
    setError("");
    try {
      const url = s.placeId ? `/api/geocode?placeId=${encodeURIComponent(s.placeId)}&session=${session}` : `/api/geocode?q=${encodeURIComponent(s.resolve!)}`;
      const r = await fetch(url);
      const j = await r.json();
      newSession();
      if (!r.ok) throw new Error(j.error || "Couldn't find that place");
      await loadCoords(j.lat, j.lon, name, j.region || s.region, j.exact ?? exact);
    } catch (e) {
      setError((e as Error).message);
      setLoading("");
    }
  }

  async function search(name = query) {
    const q = name.trim();
    if (!q) return;
    rememberQuery(q);
    if (isPin(q)) {
      // A bare PIN code: use its first area.
      setLoading("air");
      const j = await fetch(`/api/places?q=${q}`).then((r) => r.json()).catch(() => ({}));
      setLoading("");
      if (j.suggestions?.[0]) return pickSuggestion(j.suggestions[0]);
      return setError(`No area found for PIN ${q}`);
    }
    fetchAir(`q=${encodeURIComponent(q)}`);
  }

  function locate() {
    if (!navigator.geolocation) return setError("Geolocation not supported");
    setLoading("air");
    setError("");
    setStatus(t.locating);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const { latitude: lat, longitude: lon } = p.coords;
        // Name the area ("Lajpat Nagar, Delhi"); fall back to "Your location" if that fails.
        const place = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`).then((r) => r.json()).catch(() => ({}));
        const name = place?.name || t.yourLocation;
        rememberQuery(name);
        loadCoords(lat, lon, name, place?.region, true);
      },
      () => {
        setLoading("");
        setError(t.locationDenied);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
    );
  }

  const searchContext = { session, near: air ? { lat: air.location.lat, lon: air.location.lon } : undefined };

  return { t, lang, setLang, query, setQuery, profile, saveProfile, air, plan, prevPlan, planStale, loading, error, status, buildPlan, search, locate, loadCoords, pickSuggestion, searchContext };
}
