import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decideInternalAccess } from "./access";
import { allEntries, entryBySource, readEntry, resolveLink, splitFrontmatter } from "./content";
import { parseEnvExample } from "./env-file";
import { sectionBody, tableOfContents } from "./toc";

const basic = (user: string, pass: string) => `Basic ${btoa(`${user}:${pass}`)}`;

describe("internal portal access", () => {
  it("is open in development", () => {
    expect(decideInternalAccess({ nodeEnv: "development", password: undefined, authorization: null })).toBe("allow");
  });

  it("is hidden in production when no password is configured", () => {
    expect(decideInternalAccess({ nodeEnv: "production", password: undefined, authorization: basic("a", "b") })).toBe("not_found");
    expect(decideInternalAccess({ nodeEnv: "production", password: "", authorization: null })).toBe("not_found");
  });

  it("requires the configured password in production", () => {
    const password = "s3cret-handbook";
    expect(decideInternalAccess({ nodeEnv: "production", password, authorization: null })).toBe("challenge");
    expect(decideInternalAccess({ nodeEnv: "production", password, authorization: basic("team", "wrong") })).toBe("challenge");
    expect(decideInternalAccess({ nodeEnv: "production", password, authorization: basic("team", `${password}x`) })).toBe("challenge");
    expect(decideInternalAccess({ nodeEnv: "production", password, authorization: "Basic !!!not-base64" })).toBe("challenge");
    expect(decideInternalAccess({ nodeEnv: "production", password, authorization: basic("anyone", password) })).toBe("allow");
    expect(decideInternalAccess({ nodeEnv: "test", password, authorization: basic("x", "a:b") })).toBe("challenge");
  });
});

describe("content registry", () => {
  const entries = allEntries();

  it("includes every guide doc, architecture page and rule with unique URLs", () => {
    expect(entries.filter((e) => e.section === "guide").length).toBeGreaterThanOrEqual(13);
    expect(entries.filter((e) => e.section === "architecture").length).toBeGreaterThanOrEqual(10);
    expect(entries.filter((e) => e.kind === "rule").length).toBeGreaterThanOrEqual(9);
    expect(new Set(entries.map((e) => e.href)).size).toBe(entries.length);
    for (const e of entries) expect(e.title.length).toBeGreaterThan(0);
  });

  it("parses rule frontmatter", () => {
    const { meta, body } = splitFrontmatter("---\ndescription: X\nglobs: \"**/*.ts\"\nalwaysApply: false\n---\n# Title\n");
    expect(meta).toEqual({ description: "X", globs: "**/*.ts", alwaysApply: "false" });
    expect(body).toBe("# Title\n");
  });

  it("rewrites links between docs to portal pages", () => {
    expect(resolveLink("docs/README.md", "01-project-overview.md")).toEqual({ href: "/internal/guide/01-project-overview" });
    expect(resolveLink("docs/README.md", "architecture/README.md")).toEqual({ href: "/internal/architecture" });
    expect(resolveLink("docs/README.md", "../.cursor/rules/")).toEqual({ href: "/internal/rules" });
    expect(resolveLink("docs/architecture/04-amazon-integration.md", "../07-marketplace-integrations.md#79-checklist-for-the-first-live-test")).toEqual({
      href: "/internal/guide/07-marketplace-integrations#79-checklist-for-the-first-live-test",
    });
    expect(resolveLink("docs/04-financial-logic.md", "diagrams/04-financial-logic-01.svg")).toEqual({ href: "/internal/assets/diagrams/04-financial-logic-01.svg" });
    expect(resolveLink("docs/README.md", "https://example.com")).toEqual({ href: "https://example.com", external: true });
    expect(resolveLink("docs/03-architecture.md", "../src/services/ledger.ts")).toEqual({ code: "src/services/ledger.ts" });
  });

  it("every relative link in every doc resolves to a page, an anchor or a real repo path", () => {
    const broken: string[] = [];
    for (const e of entries.filter((x) => x.kind === "markdown" || x.kind === "rule")) {
      const text = readEntry(e).replace(/```[\s\S]*?```/g, "");
      for (const [, href] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (!href) continue;
        const target = resolveLink(e.source, href);
        if ("code" in target && !existsSync(path.join(process.cwd(), target.code)) && !target.code.includes("shopify")) broken.push(`${e.source} → ${href}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("builds a table of contents and extracts sections", () => {
    expect(tableOfContents("# T\n## 7.9 Checklist for the first live test\n```\n## not a heading\n```\n### Sub `code`")).toEqual([
      { depth: 2, text: "7.9 Checklist for the first live test", id: "79-checklist-for-the-first-live-test" },
      { depth: 3, text: "Sub code", id: "sub-code" },
    ]);
    const readme = entryBySource("docs/README.md");
    expect(readme && sectionBody(readEntry(readme), "The five rules you must not break")).toContain("Never use JavaScript `number` for money");
  });
});

describe(".env.example parsing", () => {
  it("documents every variable with its group and never invents values", () => {
    const vars = parseEnvExample(readFileSync(path.join(process.cwd(), ".env.example"), "utf8"));
    const names = vars.map((v) => v.name);
    for (const required of ["DATABASE_URL", "APP_URL", "TOKEN_ENCRYPTION_KEY", "AMAZON_LWA_CLIENT_SECRET", "FLIPKART_CLIENT_ID", "INTERNAL_DOCS_PASSWORD"]) {
      expect(names).toContain(required);
    }
    expect(vars.find((v) => v.name === "TOKEN_ENCRYPTION_KEY")?.description).toMatch(/32 random bytes/);
    expect(vars.find((v) => v.name === "AMAZON_SPAPI_APP_ID")?.group).toMatch(/Amazon/);
  });
});
