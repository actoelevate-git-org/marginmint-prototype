import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Registry of everything the /internal portal shows. Content is read from the
 * repository at build time; adding a file under docs/ or .cursor/rules/ makes it
 * appear automatically. Server-only (uses the filesystem).
 */
export type SectionId = "delivery" | "guide" | "architecture" | "rules" | "reference";
export type EntryKind = "markdown" | "rule" | "rules-index" | "environment" | "roadmap";

export type Entry = {
  slug: string[];
  href: string;
  section: SectionId;
  kind: EntryKind;
  /** Repo-relative source path ("" for generated pages). */
  source: string;
  title: string;
  description: string;
  order: number;
};

export const SECTIONS: { id: SectionId; title: string; blurb: string }[] = [
  { id: "delivery", title: "Delivery", blurb: "Every product step, its status and the QA evidence behind each tick." },
  { id: "guide", title: "Engineering guide", blurb: "How MarginMint works: setup, architecture, money logic, integrations, testing." },
  { id: "architecture", title: "Architecture", blurb: "Diagrams of the system as built and the full product it is becoming." },
  { id: "rules", title: "Coding rules", blurb: "The standards every change must follow (also used by AI assistants)." },
  { id: "reference", title: "Reference", blurb: "Contributor guide, README, product specification and environment variables." },
];

export const REPO_ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

/** Strip YAML-ish frontmatter (.mdc rules) and return it as key/value pairs. */
export function splitFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { meta: {}, body: text };
  const meta: Record<string, string> = {};
  for (const line of (match[1] ?? "").split("\n")) {
    const kv = /^(\w+):\s*(.*)$/.exec(line.trim());
    if (kv?.[1]) meta[kv[1]] = (kv[2] ?? "").replace(/^["']|["']$/g, "");
  }
  return { meta, body: text.slice(match[0].length) };
}

/** First H1 and first prose paragraph (blockquote markers removed). */
export function titleAndDescription(markdown: string, fallbackTitle: string): { title: string; description: string } {
  const lines = markdown.split("\n");
  const h1 = lines.find((l) => /^# /.test(l));
  const title = (h1 ?? `# ${fallbackTitle}`).replace(/^# /, "").replace(/^\d+\.\s+/, "").trim();
  let description = "";
  let inCode = false;
  for (const raw of lines) {
    if (raw.startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const line = raw.replace(/^>\s?/, "").trim();
    if (!line || line.startsWith("#") || line.startsWith("|") || line.startsWith("![") || line.startsWith("<") || line.startsWith("-")) {
      if (description) break;
      continue;
    }
    description += (description ? " " : "") + line;
  }
  const plain = description
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\*\*?[^:*]+:\*\*?\s*/, "");
  return { title, description: plain.length > 200 ? `${plain.slice(0, 197)}…` : plain };
}

function markdownEntries(dir: string, section: SectionId, base: string): Entry[] {
  const abs = path.join(REPO_ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name, index) => {
      const source = `${dir}/${name}`;
      const stem = name.replace(/\.md$/, "");
      const isIndex = stem === "README";
      const { title, description } = titleAndDescription(read(source), stem);
      const slug = isIndex ? [base] : [base, stem];
      return {
        slug,
        href: `/internal/${slug.join("/")}`,
        section,
        kind: "markdown" as const,
        source,
        title: isIndex ? (section === "guide" ? "Guide overview" : "Architecture overview") : title,
        description,
        order: isIndex ? -1 : index,
      };
    });
}

function ruleEntries(): Entry[] {
  const dir = ".cursor/rules";
  const abs = path.join(REPO_ROOT, dir);
  if (!existsSync(abs)) return [];
  const rules = readdirSync(abs)
    .filter((name) => name.endsWith(".mdc"))
    .sort()
    .map((name, index) => {
      const source = `${dir}/${name}`;
      const { meta, body } = splitFrontmatter(read(source));
      const stem = name.replace(/\.mdc$/, "");
      return {
        slug: ["rules", stem],
        href: `/internal/rules/${stem}`,
        section: "rules" as const,
        kind: "rule" as const,
        source,
        title: titleAndDescription(body, stem).title,
        description: meta.description ?? "",
        order: meta.alwaysApply === "true" ? index : 100 + index,
      };
    });
  return [
    {
      slug: ["rules"],
      href: "/internal/rules",
      section: "rules",
      kind: "rules-index",
      source: "",
      title: "All rules",
      description: "Every coding rule, what it covers and when it applies.",
      order: -1,
    },
    ...rules,
  ];
}

function referenceEntries(): Entry[] {
  const items: { stem: string; source: string; title: string; kind: EntryKind; order: number }[] = [
    { stem: "agents", source: "AGENTS.md", title: "Contributor guide (AGENTS.md)", kind: "markdown", order: 0 },
    { stem: "readme", source: "README.md", title: "Repository README", kind: "markdown", order: 1 },
    { stem: "environment", source: ".env.example", title: "Environment variables", kind: "environment", order: 2 },
    { stem: "product-spec", source: "MarginMint.md", title: "Product specification", kind: "markdown", order: 3 },
  ];
  return items
    .filter((item) => existsSync(path.join(REPO_ROOT, item.source)))
    .map((item) => ({
      slug: ["reference", item.stem],
      href: `/internal/reference/${item.stem}`,
      section: "reference" as const,
      kind: item.kind,
      source: item.source,
      title: item.title,
      description:
        item.kind === "environment"
          ? "Every server-side setting, what it is for and an example value."
          : titleAndDescription(read(item.source), item.stem).description,
      order: item.order,
    }));
}

function roadmapEntries(): Entry[] {
  if (!existsSync(path.join(REPO_ROOT, "docs/roadmap/roadmap.json"))) return [];
  return [
    {
      slug: ["roadmap"],
      href: "/internal/roadmap",
      section: "delivery",
      kind: "roadmap",
      source: "docs/roadmap/roadmap.json",
      title: "Product roadmap",
      description: "Every product step with status: done, in progress, next pick, pending, blocked, future.",
      order: 0,
    },
  ];
}

let cache: Entry[] | null = null;

export function allEntries(): Entry[] {
  // Cache only in production builds (content is fixed at build time). In development,
  // re-read so newly added docs and rules appear without restarting the server.
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = [
    ...roadmapEntries(),
    ...markdownEntries("docs", "guide", "guide"),
    ...markdownEntries("docs/architecture", "architecture", "architecture"),
    ...ruleEntries(),
    ...referenceEntries(),
  ].sort((a, b) => SECTIONS.findIndex((s) => s.id === a.section) - SECTIONS.findIndex((s) => s.id === b.section) || a.order - b.order);
  return cache;
}

export function entryBySlug(slug: string[]): Entry | undefined {
  const key = slug.join("/");
  return allEntries().find((entry) => entry.slug.join("/") === key);
}

export function entryBySource(source: string): Entry | undefined {
  return allEntries().find((entry) => entry.source === source);
}

export function readEntry(entry: Entry): string {
  if (!entry.source) return "";
  const text = read(entry.source);
  return entry.kind === "rule" ? splitFrontmatter(text).body : text;
}

export function ruleMeta(entry: Entry): Record<string, string> {
  return entry.kind === "rule" ? splitFrontmatter(read(entry.source)).meta : {};
}

export function diagramFiles(): string[] {
  const dir = path.join(REPO_ROOT, "docs/diagrams");
  return existsSync(dir) ? readdirSync(dir).filter((name) => /^[a-z0-9-]+\.svg$/.test(name)).sort() : [];
}

export function readDiagram(name: string): string | null {
  if (!/^[a-z0-9-]+\.svg$/.test(name)) return null;
  const file = path.join(REPO_ROOT, "docs/diagrams", name);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

const GITHUB_BLOB = "https://github.com/actoelevate-git-org/marginmint-prototype/blob/master/";

/**
 * Resolve a link found in a markdown file to a portal URL.
 * Returns { href } for navigable targets or { code } for repo paths with no page.
 */
export function resolveLink(fromSource: string, href: string): { href: string; external?: boolean } | { code: string } {
  if (/^(https?:|mailto:)/.test(href)) return { href, external: true };
  if (href.startsWith("#")) return { href };
  const [rawPath = "", anchor] = href.split("#");
  const target = path.posix.normalize(path.posix.join(path.posix.dirname(fromSource), rawPath)).replace(/\/$/, "");
  const hash = anchor ? `#${anchor}` : "";
  const direct = entryBySource(target);
  if (direct) return { href: direct.href + hash };
  if (target === ".cursor/rules") return { href: "/internal/rules" };
  if (target === "docs" || target === "docs/README.md") return { href: "/internal/guide" + hash };
  if (target === "docs/architecture") return { href: "/internal/architecture" };
  if (target === "docs/roadmap" || target === "docs/roadmap/README.md" || target === "docs/roadmap/roadmap.json") return { href: "/internal/roadmap" };
  if (/^docs\/diagrams\/[a-z0-9-]+\.svg$/.test(target)) return { href: `/internal/assets/diagrams/${path.posix.basename(target)}` };
  return { code: target };
}

export const SOURCE_BASE_URL = GITHUB_BLOB;
