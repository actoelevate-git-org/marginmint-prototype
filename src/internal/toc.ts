import GithubSlugger from "github-slugger";

export type TocItem = { depth: 2 | 3; text: string; id: string };

/** H2/H3 headings with the same ids rehype-slug will generate (GitHub algorithm). */
export function tableOfContents(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inCode = false;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("```")) inCode = !inCode;
    if (inCode) continue;
    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (!match) continue;
    const depth = (match[1] ?? "").length;
    const text = (match[2] ?? "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[`*_]/g, "")
      .trim();
    const id = slugger.slug(text);
    if (depth === 2 || depth === 3) items.push({ depth, text, id });
  }
  return items;
}

/** Remove the first H1 (shown in the page header instead). */
export function withoutTitle(markdown: string): string {
  return markdown.replace(/^# .*\n+/m, "");
}

/** Body of a "## Heading" section (until the next heading of the same or higher level). */
export function sectionBody(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.replace(/^#+\s+/, "").trim() === heading);
  if (start < 0) return "";
  const level = (/^#+/.exec(lines[start] ?? "")?.[0] ?? "##").length;
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const h = /^(#+)\s/.exec(line);
    if (h && (h[1] ?? "").length <= level) break;
    out.push(line);
  }
  return out.join("\n").trim();
}
