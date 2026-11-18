"use client";
// Settings remembered in the browser (language, theme, household…), read in a way that is safe for
// server rendering and React's rules: the server renders the default, the browser then shows the
// saved value. If storage is blocked (private mode), values still work for the visit, in memory.
import { useCallback, useMemo, useSyncExternalStore } from "react";

const CHANGED = "bw-storage";
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

export function useStoredString<T extends string>(key: string, fallback: T, allowed?: readonly T[]): [T, (v: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = raw != null && (!allowed || allowed.includes(raw as T)) ? (raw as T) : fallback;
  const set = useCallback((v: T) => writeStored(key, v), [key]);
  return [value, set];
}

export function useStoredJSON<T extends object>(key: string, fallback: T): [T, (v: T) => void] {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => {
    if (!raw) return fallback;
    try {
      return { ...fallback, ...JSON.parse(raw) } as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);
  const set = useCallback((v: T) => writeStored(key, JSON.stringify(v)), [key]);
  return [value, set];
}
