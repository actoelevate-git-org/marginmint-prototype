import { ArrowLeft, ArrowRight, ChevronRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocToc } from "@/components/internal/doc-toc";
import { allEntries, entryBySlug, readEntry, ruleMeta, SECTIONS, type Entry } from "@/internal/content";
import { parseEnvExample } from "@/internal/env-file";
import { MarkdownContent } from "@/internal/markdown";
import { tableOfContents, withoutTitle } from "@/internal/toc";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  // The roadmap has its own dedicated route (/internal/roadmap).
  return allEntries()
    .filter((entry) => entry.kind !== "roadmap")
    .map((entry) => ({ slug: entry.slug }));
}

type Params = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const entry = entryBySlug((await params).slug);
  return entry ? { title: entry.title, description: entry.description } : {};
}

function scopeLabel(meta: Record<string, string>): string {
  if (meta.alwaysApply === "true") return "Always applies";
  return meta.globs ? `Applies to ${meta.globs}` : "Applied on request";
}

function RulesIndex() {
  const rules = allEntries().filter((e) => e.kind === "rule");
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="w-56 px-4 py-2.5 font-semibold">Rule</th>
            <th className="px-4 py-2.5 font-semibold">What it covers</th>
            <th className="w-64 px-4 py-2.5 font-semibold">When it applies</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => {
            const meta = ruleMeta(rule);
            const always = meta.alwaysApply === "true";
            return (
              <tr key={rule.href} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <Link href={rule.href} className="font-medium text-forest hover:underline">
                    {rule.title}
                  </Link>
                  <div className="font-mono text-2xs text-muted">{rule.source.split("/").pop()}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{rule.description}</td>
                <td className="w-64 px-4 py-3">
                  <span className={always ? "rounded-full bg-mint px-2 py-0.5 text-2xs font-medium text-forest" : "block break-all font-mono text-2xs leading-relaxed text-slate-600"}>
                    {scopeLabel(meta)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EnvironmentTable({ entry }: { entry: Entry }) {
  const vars = parseEnvExample(readEntry(entry));
  const groups = [...new Set(vars.map((v) => v.group))];
  return (
    <div className="space-y-8">
      <p className="text-[14px] leading-relaxed text-slate-600">
        All variables are <strong>server-only</strong> and never reach the browser. Set them in <code className="rounded bg-slate-100 px-1">.env.local</code> locally
        or in the hosting provider&apos;s settings. Values below are placeholders from <code className="rounded bg-slate-100 px-1">.env.example</code>; never put real
        secrets in docs.
      </p>
      {groups.map((group) => (
        <section key={group}>
          <h2 id={group.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="mb-3 text-lg font-semibold tracking-tight">
            {group}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="w-64 px-4 py-2.5 font-semibold">Variable</th>
                  <th className="px-4 py-2.5 font-semibold">Purpose</th>
                  <th className="w-56 px-4 py-2.5 font-semibold">Example</th>
                </tr>
              </thead>
              <tbody>
                {vars
                  .filter((v) => v.group === group)
                  .map((v) => (
                    <tr key={v.name} className="border-t border-line align-top">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-ink">{v.name}</td>
                      <td className="px-4 py-3 text-slate-700">{v.description || "—"}</td>
                      <td className="max-w-56 break-all px-4 py-3 font-mono text-2xs text-slate-500">{v.example || "(set your own)"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function InternalPage({ params }: Params) {
  const entry = entryBySlug((await params).slug);
  if (!entry) notFound();

  const section = SECTIONS.find((s) => s.id === entry.section);
  const isMarkdown = entry.kind === "markdown" || entry.kind === "rule";
  const body = isMarkdown ? withoutTitle(readEntry(entry)) : "";
  const toc = isMarkdown ? tableOfContents(body) : [];
  const meta = ruleMeta(entry);

  const ordered = allEntries();
  const index = ordered.findIndex((e) => e.href === entry.href);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index < ordered.length - 1 ? ordered[index + 1] : undefined;

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-3xl flex-1">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
          <Link href="/internal" className="hover:text-ink">
            Handbook
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span>{section?.title}</span>
        </nav>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{entry.title}</h1>
        {entry.description && !isMarkdown ? <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{entry.description}</p> : null}
        {entry.kind === "rule" && entry.description ? <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{entry.description}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-line pb-5 text-xs text-muted">
          {entry.source ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
              <FileText className="size-3.5" aria-hidden="true" />
              {entry.source}
            </span>
          ) : null}
          {entry.kind === "rule" ? (
            <span className={meta.alwaysApply === "true" ? "rounded-full bg-mint px-2 py-1 font-medium text-forest" : "rounded-full bg-slate-100 px-2 py-1 font-mono text-slate-600"}>
              {scopeLabel(meta)}
            </span>
          ) : null}
          {entry.source === "MarginMint.md" ? <span className="rounded-full bg-warning-soft px-2 py-1 font-medium text-warning-text">Product owner document · read-only</span> : null}
        </div>

        <div className="mt-6">
          {entry.kind === "rules-index" ? <RulesIndex /> : null}
          {entry.kind === "environment" ? <EnvironmentTable entry={entry} /> : null}
          {isMarkdown ? <MarkdownContent markdown={body} source={entry.source} /> : null}
        </div>

        <nav aria-label="Previous and next" className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
          {prev ? (
            <Link href={prev.href} className="group rounded-lg border border-line p-4 hover:border-emerald/50">
              <span className="flex items-center gap-1 text-xs text-muted">
                <ArrowLeft className="size-3.5" aria-hidden="true" /> Previous
              </span>
              <span className="mt-1 block font-medium text-ink group-hover:text-forest">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={next.href} className="group rounded-lg border border-line p-4 text-right hover:border-emerald/50">
              <span className="flex items-center justify-end gap-1 text-xs text-muted">
                Next <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block font-medium text-ink group-hover:text-forest">{next.title}</span>
            </Link>
          ) : null}
        </nav>
      </article>

      {toc.length > 1 ? (
        <aside className="scrollbar-thin sticky top-24 hidden max-h-[calc(100vh-7rem)] w-56 shrink-0 overflow-y-auto xl:block">
          <DocToc items={toc} />
        </aside>
      ) : null}
    </div>
  );
}
