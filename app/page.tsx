"use client";
import { useRef } from "react";
import { AqiNow, Next24, Week } from "@/components/AirPanels";
import { HotspotMap } from "@/components/HotspotMap";
import { CityScene } from "@/components/CityScene";
import { PlanView } from "@/components/PlanView";
import { Chat } from "@/components/Chat";
import { DayForm } from "@/components/DayForm";
import { SearchBox } from "@/components/SearchBox";
import { Landing } from "@/components/Landing";
import { SiteHeader } from "@/components/SiteHeader";
import { useReveal } from "@/lib/useReveal";
import { useBreatheWise } from "@/lib/useBreatheWise";


export default function Home() {
  const { t, lang, setLang, query, setQuery, profile, saveProfile, air, plan, prevPlan, planStale, loading, error, status, buildPlan, search, locate, pickSuggestion, searchContext, loadCoords } = useBreatheWise();
  const planRef = useRef<HTMLElement>(null);
  useReveal();
  const makePlan = async () => {
    if (await buildPlan()) requestAnimationFrame(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <>
      {air && (
        <a href="#plan" className="skip-link">
          {t.skip}
        </a>
      )}
      <main id="top" className={`mx-auto max-w-7xl px-4 pt-1 sm:px-6 sm:pt-3 ${air ? "pb-28 md:pb-20" : "pb-20"}`}>
        <SiteHeader lang={lang} setLang={setLang} withSections={!!air} altHref="/v2" altLabel={t.v2.night} />

        {(() => {
          const searchForm = (
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
              className="flex flex-wrap items-center gap-1 rounded-[28px] bg-card p-1.5 shadow-sm ring-1 ring-line focus-within:ring-2 focus-within:ring-accent sm:flex-nowrap sm:rounded-full"
            >
              <SearchBox value={query} onChange={setQuery} onPick={pickSuggestion} context={searchContext} placeholder={t.searchPh} noResults={t.noResults} inputClassName="px-4 py-2.5 text-lg" />
              <button type="button" onClick={locate} disabled={!!loading} aria-label={t.myLocation} title={t.myLocation} className="ml-auto whitespace-nowrap rounded-full px-3 py-2.5 text-sm text-muted hover:text-ink disabled:opacity-50 sm:ml-0">
                <span aria-hidden="true">◎</span>
                <span className="loc-label"> {t.myLocation}</span>
              </button>
              <button disabled={!!loading} className="whitespace-nowrap rounded-full bg-ink px-6 py-2.5 font-medium text-bg disabled:opacity-50">
                {loading === "air" ? "…" : t.check}
              </button>
            </form>
          );
          const notices = (
            <>
              {error && (
                <p role="alert" className="mt-3 rounded-2xl bg-err-bg px-4 py-2.5 text-sm text-err-ink">
                  {error}
                </p>
              )}
              <p className="sr-only" aria-live="polite">
                {status}
              </p>
            </>
          );
          return air ? (
            <section className="mt-6">
              {searchForm}
              {notices}
            </section>
          ) : (
            <Landing
              lang={lang}
              searchSlot={
                <>
                  {searchForm}
                  {notices}
                </>
              }
              onSearch={(c) => search(c)}
              onCity={(c) => {
                setQuery(c.name);
                loadCoords(c.lat, c.lon, c.name, c.state);
              }}
              onLocate={locate}
              onCta={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => (document.querySelector('[role="combobox"]') as HTMLInputElement | null)?.focus(), 400);
              }}
            />
          );
        })()}

        {air && (
          <div className="mt-5 space-y-5">
            <div id="air" className="scroll-mt-20">
              <CityScene air={air} lang={lang} />
            </div>

            <div id="day" className="reveal grid scroll-mt-20 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <DayForm profile={profile} onChange={saveProfile} lang={lang} onSubmit={makePlan} busy={loading === "plan"} hasPlan={!!plan} stale={planStale} />
              <div className="space-y-5">
                <Next24 air={air} lang={lang} />
                <AqiNow air={air} lang={lang} />
              </div>
            </div>

            <section id="plan" ref={planRef} tabIndex={-1} className="scroll-mt-20 outline-none" aria-busy={loading === "plan"}>
              {loading === "plan" && <p className="animate-pulse rounded-[24px] bg-card p-6 text-muted ring-1 ring-line">{t.planLoading}</p>}
              {!plan && loading !== "plan" && <p className="rounded-[24px] border border-dashed border-line p-6 text-center text-muted">{t.planEmpty}</p>}
              {plan && loading !== "plan" && <PlanView result={plan} previous={prevPlan} lang={lang} />}
            </section>

            <div id="ask" className="reveal grid scroll-mt-20 gap-5 lg:grid-cols-2">
              <Chat key={`${air.location.lat},${air.location.lon}`} air={air} profile={profile} lang={lang} />
              <div className="space-y-5">
                <Week air={air} lang={lang} />
                <HotspotMap air={air} lang={lang} />
              </div>
            </div>
          </div>
        )}

        <p className="mt-14 text-center text-xs text-muted">{t.disclaimer}</p>
      </main>
    </>
  );
}
