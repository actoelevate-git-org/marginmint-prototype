#!/usr/bin/env node
/**
 * Renders every Mermaid block in docs/ to an SVG in docs/diagrams/ and rewrites
 * the block as an embedded picture + collapsible source, so diagrams show in
 * VS Code's Markdown preview, on GitHub and anywhere else.
 *
 *   npm run docs:diagrams                       # every doc
 *   npm run docs:diagrams -- docs/04-financial-logic.md   # only matching docs
 *
 * Idempotent: edit the Mermaid source inside a <details> block, re-run, and the
 * picture is regenerated. Uses @mermaid-js/mermaid-cli via npx (not a project
 * dependency). Set PUPPETEER_EXECUTABLE_PATH to use an installed Chrome instead
 * of letting Puppeteer download one.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");
const outDir = join(docsDir, "diagrams");
const config = join(outDir, "mermaid.config.json");
const MMDC = process.env.MMDC ?? null;
const CLI = ["-y", "@mermaid-js/mermaid-cli@11.4.2"];

// Canonical block (optional picture + details wrapper) or a bare mermaid block.
const BLOCK =
  /(?:!\[[^\]]*\]\([^)]*diagrams\/[^)]+\.svg\)\n\n<details>\n<summary>[^\n]*<\/summary>\n\n)?```mermaid\n([\s\S]*?)```(?:\n\n<\/details>)?/g;

function markdownFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "diagrams" ? [] : markdownFiles(path);
    return name.endsWith(".md") ? [path] : [];
  });
}

function headingBefore(text, index) {
  const headings = [...text.slice(0, index).matchAll(/^#{1,6} (.+)$/gm)];
  const last = headings.at(-1)?.[1] ?? "Diagram";
  return last.replace(/[`*[\]]/g, "").replace(/\(.*?\)/g, "").trim();
}

const work = mkdtempSync(join(tmpdir(), "mm-docs-"));
const puppeteerConfig = join(work, "puppeteer.json");
writeFileSync(
  puppeteerConfig,
  JSON.stringify(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
);

const filters = process.argv.slice(2).map((arg) => arg.replace(/^\.\//, ""));
const selected = (file) => filters.length === 0 || filters.some((f) => relative(root, file).includes(f));

let rendered = 0;
for (const file of markdownFiles(docsDir).sort().filter(selected)) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("```mermaid")) continue;
  const rel = relative(docsDir, file);
  const stem = rel.replace(/\.md$/, "").replaceAll("/", "-");
  const toDiagrams = relative(dirname(file), outDir).replaceAll("\\", "/");
  let n = 0;
  const next = text.replace(BLOCK, (_match, source, offset) => {
    n += 1;
    const name = `${stem}-${String(n).padStart(2, "0")}.svg`;
    const input = join(work, `${stem}-${n}.mmd`);
    writeFileSync(input, source);
    const args = ["-q", "-c", config, "-p", puppeteerConfig, "-b", "white", "-i", input, "-o", join(outDir, name)];
    if (MMDC) execFileSync(MMDC, args, { stdio: "inherit" });
    else execFileSync("npx", [...CLI, ...args], { stdio: "inherit" });
    rendered += 1;
    const alt = `${headingBefore(text, offset)} (diagram)`;
    return [
      `![${alt}](${toDiagrams}/${name})`,
      "",
      "<details>",
      "<summary>Diagram source (Mermaid): edit here, then run <code>npm run docs:diagrams</code></summary>",
      "",
      "```mermaid",
      source.replace(/\n?$/, "\n") + "```",
      "",
      "</details>",
    ].join("\n");
  });
  if (next !== text) writeFileSync(file, next);
  console.log(`${rel}: ${n} diagram(s)`);
}
console.log(`Rendered ${rendered} diagram(s) to ${relative(root, outDir)}/ (${basename(config)})`);
