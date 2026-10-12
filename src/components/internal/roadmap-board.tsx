"use client";

import { CheckCircle2, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { RoadmapStep, StepStatus } from "@/internal/roadmap";
import { cn } from "@/lib/utils";
import { STATUS_STYLE, StatusPill } from "./roadmap-status";

type Phase = { id: string; title: string; goal: string };
const ORDER: StepStatus[] = ["done", "in_progress", "next", "pending", "blocked", "future"];

function StepRow({ step, open }: { step: RoadmapStep; open: boolean }) {
  const done = step.status === "done";
  return (
    <details id={step.id} open={open} className="group scroll-mt-24 border-t border-line first:border-t-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span
          className={cn("flex size-5 shrink-0 items-center justify-center rounded border", done ? "border-emerald bg-emerald text-white" : "border-slate-300 bg-white")}
          aria-hidden="true"
        >
          {done ? <CheckCircle2 className="size-3.5" /> : null}
        </span>
        <span className="w-12 shrink-0 font-mono text-xs text-slate-500">{step.id}</span>
        <span className={cn("min-w-0 flex-1 text-sm font-medium", done ? "text-slate-700" : "text-ink")}>{step.title}</span>
        <span className="hidden text-2xs uppercase tracking-wide text-slate-400 sm:inline">{step.kind}</span>
        <StatusPill status={step.status} />
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-4 bg-slate-50/60 px-4 pb-5 pt-1 text-[13px] leading-relaxed text-slate-700 sm:pl-[4.75rem]">
        <p>{step.summary}</p>
        {step.status === "blocked" && step.blockedReason ? (
          <p className="rounded-md border border-red-200 bg-loss-soft px-3 py-2 text-loss-text">
            <strong>Blocked:</strong> {step.blockedReason}
          </p>
        ) : null}
        <div>
          <p className="mb-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">Acceptance criteria</p>
          <ul className="space-y-1">
            {step.acceptance.map((a) => (
              <li key={a} className="flex gap-2">
                <span className={cn("mt-1 size-3 shrink-0 rounded-sm border", done ? "border-emerald bg-emerald" : "border-slate-300 bg-white")} aria-hidden="true" />
                <span>
                  <span className="sr-only">{done ? "Met: " : "Not yet verified: "}</span>
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Automated tests</dt>
            <dd className="mt-0.5 font-mono text-xs">{step.tests.length ? step.tests.map((t) => <div key={t}>{t}</div>) : <span className="font-sans text-slate-400">None listed yet</span>}</dd>
          </div>
          <div>
            <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Depends on</dt>
            <dd className="mt-0.5">
              {step.dependsOn.length
                ? step.dependsOn.map((d) => (
                    <a key={d} href={`#${d}`} className="mr-2 font-mono text-xs text-forest hover:underline">
                      {d}
                    </a>
                  ))
                : <span className="text-slate-400">Nothing</span>}
            </dd>
          </div>
          {step.manualQa.length ? (
            <div className="sm:col-span-2">
              <dt className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Manual QA</dt>
              <dd className="mt-0.5">{step.manualQa.join(" · ")}</dd>
            </div>
          ) : null}
        </dl>
        {step.evidence ? (
          <div className="rounded-lg border border-emerald-200 bg-white p-3">
            <p className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-gain-text">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Verified by the QA gate on {step.evidence.verifiedAt.slice(0, 10)} at <code className="rounded bg-slate-100 px-1 font-mono text-slate-700">{step.evidence.commit}</code>
              {step.evidence.dirty ? <span className="font-normal text-slate-500">(with uncommitted changes)</span> : null}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {step.evidence.checks.map((c) => (
                <li key={c.name} className="rounded border border-emerald-200 bg-gain-soft px-1.5 py-0.5 text-2xs font-medium text-gain-text">
                  ✓ {c.name} · {Math.max(1, Math.round(c.durationMs / 1000))}s
                </li>
              ))}
              {step.evidence.testFiles.map((t) => (
                <li key={t.file} className="rounded border border-line bg-slate-50 px-1.5 py-0.5 font-mono text-2xs text-slate-600">
                  {t.file.split("/").pop()} · {t.tests} passed
                </li>
              ))}
            </ul>
            {step.evidence.qaNotes ? <p className="mt-2 text-xs text-slate-600"><strong>QA notes:</strong> {step.evidence.qaNotes}</p> : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function RoadmapBoard({ phases, steps }: { phases: Phase[]; steps: RoadmapStep[] }) {
  const [filter, setFilter] = useState<StepStatus | "all">("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => steps.filter((s) => (filter === "all" || s.status === filter) && (!q || `${s.id} ${s.title} ${s.summary}`.toLowerCase().includes(q))),
    [steps, filter, q],
  );
  const count = (status: StepStatus) => steps.filter((s) => s.status === status).length;

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-1 flex flex-col gap-3 bg-white/95 px-1 py-3 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
        <div role="radiogroup" aria-label="Filter by status" className="scrollbar-thin flex gap-1.5 overflow-x-auto">
          {(["all", ...ORDER] as const).map((key) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  active ? "border-ink bg-ink text-white" : "border-line bg-white text-slate-600 hover:border-slate-300 hover:text-ink",
                )}
              >
                {key === "all" ? "All" : STATUS_STYLE[key].label}
                <span className={cn("num text-2xs", active ? "text-white/70" : "text-slate-400")}>{key === "all" ? steps.length : count(key)}</span>
              </button>
            );
          })}
        </div>
        <div className="relative w-full lg:w-64">
          <label htmlFor="roadmap-search" className="sr-only">Search steps</label>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="roadmap-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search steps…"
            className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-3 text-sm shadow-card placeholder:text-slate-400 focus-visible:border-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/25"
          />
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {phases.map((phase) => {
          const phaseSteps = steps.filter((s) => s.phase === phase.id);
          const shown = visible.filter((s) => s.phase === phase.id);
          if (shown.length === 0) return null;
          const done = phaseSteps.filter((s) => s.status === "done").length;
          const pct = Math.round((done / phaseSteps.length) * 100);
          return (
            <section key={phase.id} aria-labelledby={`phase-${phase.id}`} className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
              <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h2 id={`phase-${phase.id}`} className="font-semibold text-ink">{phase.title}</h2>
                  <p className="text-xs text-slate-500">{phase.goal}</p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-56">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${phase.title} progress`}>
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="num shrink-0 text-xs font-medium text-slate-600">{done}/{phaseSteps.length}</span>
                </div>
              </header>
              {shown.map((step) => (
                <StepRow key={step.id} step={step} open={Boolean(q) || filter === "in_progress" || filter === "next" || filter === "blocked"} />
              ))}
            </section>
          );
        })}
        {visible.length === 0 ? <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-slate-500">No steps match this filter.</p> : null}
      </div>
    </div>
  );
}
