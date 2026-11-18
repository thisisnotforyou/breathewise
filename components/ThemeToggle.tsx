"use client";
// Light / Dark / Auto switch. The choice is remembered; Auto follows the device setting live.
import { useEffect } from "react";
import { useStoredString } from "@/lib/useStored";

type Pref = "auto" | "light" | "dark";
const ORDER: Pref[] = ["auto", "light", "dark"];

function apply(p: Pref) {
  const dark = p === "dark" || (p === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function ThemeToggle({ labels }: { labels: { auto: string; light: string; dark: string; label: string } }) {
  const [pref, setPref] = useStoredString<Pref>("bw-theme", "auto", ORDER);

  useEffect(() => {
    apply(pref);
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const next = () => setPref(ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length]);

  return (
    <button onClick={next} aria-label={`${labels.label}: ${labels[pref]}`} title={`${labels.label}: ${labels[pref]}`} className="flex h-9 items-center gap-1.5 rounded-full bg-card px-3 text-sm text-muted ring-1 ring-line hover:text-ink">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {pref === "light" ? (
          <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        ) : pref === "dark" ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
        ) : (
          <path d="M12 21a9 9 0 1 0 0-18v18Zm0-18a9 9 0 1 1 0 18" />
        )}
      </svg>
      <span className="hidden sm:inline">{labels[pref]}</span>
    </button>
  );
}
