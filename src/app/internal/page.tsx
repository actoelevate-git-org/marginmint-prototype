import { ArrowRight, BookOpen, FileCode2, Layers, Library, Lightbulb, Lock, Map as MapIcon, Network, Rocket, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { allEntries, diagramFiles, entryBySource, readEntry, SECTIONS } from "@/internal/content";
import { loadRoadmap, roadmapProgress } from "@/internal/roadmap";
import { MarkdownContent } from "@/internal/markdown";
import { sectionBody } from "@/internal/toc";

export const metadata: Metadata = { title: "Internal handbook" };
export const dynamic = "force-static";

const SECTION_ICON = { delivery: MapIcon, guide: BookOpen, architecture: Layers, rules: FileCode2, reference: Library } as const;

const START_HERE = [
  { source: "docs/00-why-marginmint.md", icon: Lightbulb, why: "The problem we solve, shown with real numbers." },
  { source: "docs/01-project-overview.md", icon: Rocket, why: "What MarginMint is, what's built and what isn't." },
  { source: "docs/02-getting-started.md", icon: BookOpen, why: "Run it locally; every env var and command." },
  { source: "docs/architecture/10-full-product-architecture.md", icon: Network, why: "The whole product on one page." },
  { source: "docs/04-financial-logic.md", icon: Scale, why: "How every rupee on screen is calculated." },
  { source: "docs/roadmap/roadmap.json", icon: MapIcon, why: "Every product step and what's next." },
];

export default function InternalHome() {
  const entries = allEntries();
  const roadmap = roadmapProgress(loadRoadmap());
  const count = (id: string) => entries.filter((e) => e.section === id && e.kind !== "rules-index" && !e.slug.every((s) => s === id)).length;
  const stats = [
    { label: "Guide pages", value: count("guide") },
    { label: "Architecture pages", value: count("architecture") },
    { label: "Diagrams", value: diagramFiles().length },
    { label: "Coding rules", value: count("rules") },
    { label: "Roadmap done", value: `${roadmap.percentDone}%` },
  ];
  const guideIndex = entryBySource("docs/README.md");
  const fiveRules = guideIndex ? sectionBody(readEntry(guideIndex), "The five rules you must not break") : "";

  return (
    <div className="mx-auto max-w-5xl">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-mint/70 via-white to-white px-6 py-10 sm:px-10">
        <p className="text-[13px] font-medium uppercase tracking-wider text-forest">Internal handbook</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Everything the team needs to build MarginMint.</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
          Engineering guides, architecture diagrams, coding rules and the product specification, generated straight from the repository so it always
          matches the code.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/internal/guide/00-why-marginmint" className="inline-flex h-10 items-center gap-1.5 rounded-md bg-forest px-4 text-sm font-medium text-white hover:bg-forest-600">
            Start reading <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/internal/architecture/10-full-product-architecture" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium shadow-card hover:bg-slate-50">
            Full product architecture
          </Link>
          <Link href="/internal/roadmap" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium shadow-card hover:bg-slate-50">
            Product roadmap
          </Link>
          <Link href="/internal/rules" className="inline-flex h-10 items-center rounded-md border border-line bg-white px-4 text-sm font-medium shadow-card hover:bg-slate-50">
            Coding rules
          </Link>
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg border border-line bg-white/80 px-4 py-3">
              <dt className="text-xs text-muted">{s.label}</dt>
              <dd className="mt-0.5 text-2xl font-semibold tracking-tight text-ink">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="start-heading">
        <h2 id="start-heading" className="text-lg font-semibold tracking-tight">New to the project? Start here</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {START_HERE.map((step, index) => {
            const entry = entryBySource(step.source);
            if (!entry) return null;
            const Icon = step.icon;
            return (
              <li key={step.source}>
                <Link href={entry.href} className="group flex h-full gap-4 rounded-xl border border-line bg-white p-4 shadow-card transition hover:border-emerald/50 hover:shadow-popover">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-mint text-forest">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Step {index + 1}</span>
                    <span className="block font-medium text-ink group-hover:text-forest">{entry.title}</span>
                    <span className="mt-0.5 block text-[13px] text-slate-600">{step.why}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      {fiveRules && guideIndex ? (
        <section className="mt-12 rounded-xl border border-amber-200 bg-warning-soft/60 p-6" aria-labelledby="rules-heading">
          <h2 id="rules-heading" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Lock className="size-5 text-warning-text" aria-hidden="true" />
            The five rules you must not break
          </h2>
          <div className="mt-2 [&_.prose]:text-[14px]">
            <MarkdownContent markdown={fiveRules} source={guideIndex.source} />
          </div>
        </section>
      ) : null}

      <section className="mt-12" aria-labelledby="browse-heading">
        <h2 id="browse-heading" className="text-lg font-semibold tracking-tight">Browse everything</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SECTIONS.map((section) => {
            const Icon = SECTION_ICON[section.id];
            const items = entries.filter((e) => e.section === section.id);
            return (
              <div key={section.id} className="rounded-xl border border-line bg-white p-5 shadow-card">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-forest" aria-hidden="true" />
                  <h3 className="font-semibold">{section.title}</h3>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 text-2xs font-medium text-slate-600">{items.length}</span>
                </div>
                <p className="mt-1 text-[13px] text-slate-600">{section.blurb}</p>
                <ul className="mt-3 divide-y divide-line">
                  {items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="flex items-center justify-between gap-3 py-2 text-[13px] text-slate-700 hover:text-forest">
                        <span className="truncate">{item.title}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        Generated at build time from <code className="rounded bg-slate-100 px-1">docs/</code>, <code className="rounded bg-slate-100 px-1">.cursor/rules/</code>,{" "}
        <code className="rounded bg-slate-100 px-1">AGENTS.md</code>, <code className="rounded bg-slate-100 px-1">README.md</code>,{" "}
        <code className="rounded bg-slate-100 px-1">MarginMint.md</code> and <code className="rounded bg-slate-100 px-1">.env.example</code>. Open in development; in
        production this handbook is hidden unless <code className="rounded bg-slate-100 px-1">INTERNAL_DOCS_PASSWORD</code> is set.
      </footer>
    </div>
  );
}
