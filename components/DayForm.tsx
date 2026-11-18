"use client";
import { dict } from "@/lib/i18n";
import type { Lang, Profile } from "@/lib/types";

type Props = { profile: Profile; onChange: (p: Profile) => void; lang: Lang; onSubmit: () => void; busy: boolean; hasPlan: boolean; stale: boolean };

export function DayForm({ profile, onChange, lang, onSubmit, busy, hasPlan, stale }: Props) {
  const t = dict[lang];
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  const toggle = (v: string) => set({ household: profile.household.includes(v) ? profile.household.filter((x) => x !== v) : [...profile.household, v] });
  const field = "w-full rounded-2xl bg-bg px-3.5 py-2.5 ring-1 ring-line focus:ring-accent";

  return (
    <form
      className="rounded-[24px] bg-card p-6 ring-1 ring-line"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      aria-labelledby="day-title"
    >
      <h2 id="day-title" className="font-display text-3xl">
        {t.yourDay}
      </h2>

      <label htmlFor="routine" className="mt-4 block font-medium">
        {t.routineLabel}
      </label>
      <p id="routine-hint" className="text-sm text-muted">
        {t.routineHint}
      </p>
      <textarea
        id="routine"
        value={profile.routine}
        onChange={(e) => set({ routine: e.target.value })}
        placeholder={t.routinePh}
        aria-describedby="routine-hint"
        rows={3}
        maxLength={600}
        className={`${field} mt-2 resize-y text-lg leading-relaxed`}
      />

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">{t.who}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(t.householdOpts).map(([v, l]) => {
            const on = profile.household.includes(v);
            return (
              <button type="button" key={v} onClick={() => toggle(v)} aria-pressed={on} className={`rounded-full px-3.5 py-1.5 text-sm ring-1 transition ${on ? "bg-ink text-bg ring-ink" : "ring-line hover:ring-muted"}`}>
                {on && <span aria-hidden="true">✓ </span>}
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-[0.6fr_1fr_1.4fr]">
        <label className="text-sm font-medium">
          {t.members}
          <input type="number" min={1} max={20} value={profile.members} onChange={(e) => set({ members: Number(e.target.value) || 1 })} className={`${field} mt-1 font-normal`} />
        </label>
        <label className="text-sm font-medium">
          {t.commute}
          <select value={profile.commute} onChange={(e) => set({ commute: e.target.value })} className={`${field} mt-1 font-normal`}>
            {Object.entries(t.commuteOpts).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          {t.home}
          <select value={profile.home} onChange={(e) => set({ home: e.target.value })} className={`${field} mt-1 font-normal`}>
            {Object.entries(t.homeOpts).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">{t.notes}</summary>
        <label htmlFor="notes" className="sr-only">
          {t.notes}
        </label>
        <textarea id="notes" value={profile.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t.notesPh} rows={2} maxLength={400} className={`${field} mt-2`} />
      </details>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button disabled={busy} className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent disabled:opacity-50">
          {busy ? "…" : hasPlan ? t.updatePlan : t.makePlan}
        </button>
        {stale && !busy && (
          <p className="text-sm text-warn-ink" role="status">
            {t.changedHint}
          </p>
        )}
      </div>
    </form>
  );
}
