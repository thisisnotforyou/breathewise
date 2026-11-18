"use client";
import { dict } from "@/lib/i18n";
import type { Lang, Plan } from "@/lib/types";
import { Card } from "./Card";

export type PlanTrace = { prompt: { role: string; content: string }[]; raw: string; corrections: string[] };
export type PlanResult = { plan: Plan; source: string; model?: string; reason?: string; cached?: boolean; trace?: PlanTrace };

const EXPO = { low: "#3a9d5d", medium: "#d9971a", high: "#d0412f" } as const;
const key = (s: { time: string; activity: string }) => `${s.time}|${s.activity}`.toLowerCase();

export function PlanView({ result, previous, lang }: { result: PlanResult; previous: PlanResult | null; lang: Lang }) {
  const t = dict[lang];
  const { plan } = result;
  const ai = result.source !== "rules";
  const schedule = [...(plan.schedule ?? [])].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const before = new Set((previous?.plan.schedule ?? []).map(key));

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ai ? "bg-ok-bg text-ok-ink" : "bg-warn-bg text-warn-ink"}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ai ? "#2e8b5e" : "#c48a1a" }} aria-hidden="true" />
            {ai ? t.badgeAi(result.model || result.source) : t.badgeRules(result.reason || "")}
          </span>
          {result.cached && <span className="text-xs text-muted">{t.cachedNote}</span>}
        </div>
        <h2 className="font-display mt-3 text-4xl leading-tight sm:text-5xl">{plan.headline}</h2>
        <p className="mt-3 max-w-3xl text-lg text-muted">{plan.summary}</p>
        <Trace result={result} lang={lang} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card title={t.routine} className="lg:col-span-3">
          <ol className="relative ml-1 border-l border-line pl-6">
            {schedule.map((s, i) => {
              const color = EXPO[s.exposure] ?? EXPO.medium;
              const changed = !!previous && !before.has(key(s));
              return (
                <li key={i} className="relative mb-5 last:mb-0">
                  <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card" style={{ background: color }} aria-hidden="true" />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-display text-xl tabular-nums">{s.time}</span>
                    <span className="font-medium">{s.activity}</span>
                    {s.fixed && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-bg">{t.fixed}</span>}
                    {changed && <span className="rounded-full bg-warn-bg px-2 py-0.5 text-[11px] font-medium text-warn-ink">{t.newTag}</span>}
                  </div>
                  <p className="text-sm text-muted">
                    <span className="sr-only">{t.exposure[s.exposure] ?? ""}. </span>
                    {s.why}
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>
        <div className="space-y-5 lg:col-span-2">
          {plan.impact?.length > 0 && (
            <Card title={t.impactTitle}>
              <ul className="space-y-3 text-sm">
                {plan.impact.map((x, i) => (
                  <li key={i}>
                    <b className="font-medium">{x.action}</b>
                    <p className="text-muted">{x.effect}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={t.family}>
            <ul className="space-y-3 text-sm">
              {plan.family?.map((f, i) => (
                <li key={i}>
                  <b className="font-medium">{f.who}</b>
                  <p className="text-muted">{f.advice}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card title={t.indoor}>
          <ul className="space-y-2.5 text-sm">
            {plan.indoor?.map((x, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{x.tip}</span>
                <span className="h-fit shrink-0 self-start whitespace-nowrap rounded-full bg-bg px-2 py-0.5 text-xs text-muted">{x.cost}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.commuteTitle}>
          <ul className="space-y-2.5 text-sm">
            {plan.commute?.map((x, i) => (
              <li key={i}>
                <b className="font-medium">{x.option}</b>
                <p className="text-muted">{x.why}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.swaps}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {plan.swaps?.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {plan.weekAhead && (
          <Card title={t.weekAhead}>
            <p className="text-sm">{plan.weekAhead}</p>
          </Card>
        )}
        <Card title={t.health}>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {plan.healthWatch?.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}

/** "How this plan was made": the exact prompt, the model's raw reply, and what we corrected. */
function Trace({ result, lang }: { result: PlanResult; lang: Lang }) {
  const T = dict[lang].trace;
  const tr = result.trace;
  const pretty = (raw: string) => {
    try {
      return JSON.stringify(JSON.parse(raw.replace(/^```(?:json)?\s*|```$/g, "")), null, 2);
    } catch {
      return raw;
    }
  };
  const block = "mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-bg p-3 font-mono text-[11.5px] leading-relaxed text-ink/90 ring-1 ring-line";
  return (
    <details className="group mt-5 rounded-2xl border border-line px-4 py-3 text-sm">
      <summary className="cursor-pointer select-none font-medium text-muted hover:text-ink">
        <span aria-hidden="true" className="mr-1.5 inline-block transition group-open:rotate-90">›</span>
        {T.title}
      </summary>
      {!tr ? (
        <p className="mt-3 text-muted">{T.rules}</p>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-muted">{T.model(result.model || result.source)}</p>
          <div>
            <p className="font-medium">{T.sent}</p>
            {tr.prompt.map((m, i) => (
              <div key={i} className="mt-2">
                <p className="text-xs uppercase tracking-wider text-muted">{m.role === "system" ? T.system : T.user}</p>
                <pre className={block}>{m.content}</pre>
              </div>
            ))}
          </div>
          <div>
            <p className="font-medium">{T.reply}</p>
            <pre className={block}>{pretty(tr.raw)}</pre>
          </div>
          <div>
            <p className="font-medium">{T.checked}</p>
            {tr.corrections.length ? (
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-muted">
                {tr.corrections.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-muted">{T.noFix}</p>
            )}
          </div>
        </div>
      )}
    </details>
  );
}
