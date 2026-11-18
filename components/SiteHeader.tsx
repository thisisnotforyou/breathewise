"use client";
// Sticky, frosted header for every page. When results are showing it also offers section links
// (desktop) and a thumb-friendly bottom bar (phones), both highlighting the section in view.
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

export const SECTIONS = ["air", "day", "plan", "ask"] as const;
type Section = (typeof SECTIONS)[number];

/** Which section is currently in view (for highlighting navigation). */
function useActiveSection(enabled: boolean): Section | null {
  const [active, setActive] = useState<Section | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const els = SECTIONS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as Section);
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

const ICON: Record<Section, React.ReactNode> = {
  air: <path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M5 19h5" />,
  day: <path d="M8 3v3M16 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />,
  plan: <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  ask: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />,
};

export function SiteHeader({ lang, setLang, withSections, altHref, altLabel }: { lang: Lang; setLang: (l: Lang) => void; withSections: boolean; altHref: string; altLabel: string }) {
  const t = dict[lang];
  const labels: Record<Section, string> = { air: t.v2.nav.air, day: t.v2.nav.day, plan: t.v2.nav.plan, ask: t.v2.nav.ask };
  const active = useActiveSection(withSections);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-40 -mx-4 px-4 py-3 transition-[background,box-shadow] sm:-mx-6 sm:px-6 ${scrolled ? "bg-bg/80 shadow-[0_1px_0_var(--line)] backdrop-blur-md" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <a href="#top" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: "smooth" }))} className="flex items-center gap-2.5" aria-label="BreatheWise — top">
            <Logo />
          </a>
          {withSections && (
            <nav aria-label="Sections" className="hidden items-center gap-1 rounded-full bg-card/70 p-1 text-sm ring-1 ring-line md:flex">
              {SECTIONS.map((id) => (
                <a key={id} href={`#${id}`} aria-current={active === id ? "true" : undefined} className={`rounded-full px-3.5 py-1.5 transition ${active === id ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
                  {labels[id]}
                </a>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <Link href={altHref} className="hidden rounded-full px-3 py-1.5 text-sm text-muted hover:text-ink lg:inline">
              {altLabel} ↗
            </Link>
            <ThemeToggle labels={t.v2.theme} />
            <div className="flex rounded-full bg-card p-1 text-sm ring-1 ring-line" role="group" aria-label="Language / भाषा">
              {(["en", "hi"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-full px-3 py-1 ${lang === l ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
                  <span className="sm:hidden">{l === "en" ? "EN" : "हिं"}</span>
                  <span className="hidden sm:inline">{l === "en" ? "English" : "हिंदी"}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Phone bottom bar */}
      {withSections && (
        <nav aria-label="Sections" className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] bg-ink/95 p-1.5 text-bg shadow-xl backdrop-blur md:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <ul className="grid grid-cols-4">
            {SECTIONS.map((id) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={active === id ? "true" : undefined} className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] transition ${active === id ? "bg-bg/15" : "opacity-75"}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICON[id]}
                  </svg>
                  {labels[id]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
