import { ArrowRight, FileText, ShieldCheck, Terminal } from "lucide-react";
import type { Metadata } from "next";
import { RoadmapBoard } from "@/components/internal/roadmap-board";
import { STATUS_STYLE, StatusPill } from "@/components/internal/roadmap-status";
import { loadRoadmap, roadmapIssues, roadmapProgress, STEP_STATUSES, type RoadmapStep } from "@/internal/roadmap";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Product roadmap" };
export const dynamic = "force-static";

function HighlightCard({ title, steps, empty }: { title: string; steps: RoadmapStep[]; empty: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      {steps.length === 0 ? (
        <p className="mt-2 text-[13px] text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {steps.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="group flex items-start gap-2 text-[13px]">
                <StatusPill status={s.status} />
                <span className="min-w-0">
                  <span className="font-mono text-xs text-slate-500">{s.id}</span> <span className="font-medium text-ink group-hover:text-forest">{s.title}</span>
                  {s.status === "blocked" && s.blockedReason ? <span className="mt-0.5 block text-xs text-slate-500">{s.blockedReason}</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  const roadmap = loadRoadmap();
  const issues = roadmapIssues(roadmap);
  const { counts, total, percentDone } = roadmapProgress(roadmap);
  const by = (status: RoadmapStep["status"]) => roadmap.steps.filter((s) => s.status === status);
  const updated = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(roadmap.updatedAt));

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-[13px] text-muted">Handbook › Delivery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Product roadmap</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">
        Every step of the full product, in order. A step is ticked <strong>only</strong> by the QA gate after typecheck, lint, the full test suite, the
        production build and manual QA all pass. The evidence is shown on each step.
      </p>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
        <FileText className="size-3.5" aria-hidden="true" /> docs/roadmap/roadmap.json · updated {updated} IST
      </p>

      {issues.length ? (
        <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-loss-soft p-4 text-sm text-loss-text">
          <strong>The roadmap file has {issues.length} integrity problem(s).</strong> Steps may have been edited by hand; run the QA gate.
          <ul className="mt-2 list-disc pl-5 text-xs">{issues.slice(0, 8).map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-line bg-gradient-to-br from-mint/60 via-white to-white p-6" aria-label="Overall progress">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Overall progress</p>
            <p className="text-4xl font-semibold tracking-tight text-ink">
              {percentDone}%<span className="ml-2 text-base font-normal text-slate-500">{counts.done} of {total} steps verified</span>
            </p>
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs text-gain-text">
            <ShieldCheck className="size-4" aria-hidden="true" /> {issues.length === 0 ? "All ticks backed by QA-gate evidence" : "Integrity problems found"}
          </p>
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={STEP_STATUSES.map((s) => `${STATUS_STYLE[s].label} ${counts[s]}`).join(", ")}>
          {STEP_STATUSES.map((s) => (counts[s] ? <div key={s} className={cn(STATUS_STYLE[s].bar, "h-full")} style={{ width: `${(counts[s] / total) * 100}%` }} /> : null))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {STEP_STATUSES.map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full", STATUS_STYLE[s].dot)} aria-hidden="true" />
              {STATUS_STYLE[s].label} <strong className="num text-ink">{counts[s]}</strong>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <HighlightCard title="⭐ Next pick" steps={by("next")} empty="No next pick set. Run npm run roadmap:next -- <ID>." />
        <HighlightCard title="🔨 In progress" steps={by("in_progress")} empty="Nothing in progress." />
        <HighlightCard title="⛔ Blocked" steps={by("blocked")} empty="Nothing blocked." />
      </div>

      <section className="mt-6 rounded-xl border border-line bg-slate-950 p-5 text-slate-100" aria-labelledby="how-heading">
        <h2 id="how-heading" className="flex items-center gap-2 text-sm font-semibold">
          <Terminal className="size-4 text-emerald-300" aria-hidden="true" /> How a step gets ticked (automatic with Cursor, see the roadmap rule)
        </h2>
        <ol className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          {[
            ["Start", "npm run roadmap:start -- <ID>"],
            ["Build + tests", "meet acceptance criteria, list test files"],
            ["QA gate", 'npm run roadmap:verify -- <ID> --qa "…"'],
            ["Ticked ✅", "evidence recorded; set the next pick"],
          ].map(([title, cmd], i, arr) => (
            <li key={title} className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald/20 text-2xs font-semibold text-emerald-300">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-medium text-white">{title}</span>
                <code className="block break-words font-mono text-[11px] text-slate-300">{cmd}</code>
              </span>
              {i < arr.length - 1 ? <ArrowRight className="mt-0.5 hidden size-3.5 shrink-0 text-slate-500 sm:block" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8">
        <RoadmapBoard phases={roadmap.phases} steps={roadmap.steps} />
      </div>
    </div>
  );
}
