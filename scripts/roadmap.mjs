#!/usr/bin/env node
/**
 * MarginMint roadmap CLI and QA gate.
 *
 *   npm run roadmap                          status summary
 *   npm run roadmap:start  -- <ID>           mark a step in progress
 *   npm run roadmap:next   -- <ID>           make a step the single "next pick"
 *   npm run roadmap:verify -- <ID> [--qa "manual QA notes"]
 *   npm run roadmap:verify -- --all-done [--qa "..."]   re-audit every done step
 *   npm run roadmap:render                   regenerate docs/roadmap/README.md
 *
 * A step becomes "done" ONLY through `verify`, which runs the full QA gate:
 * typecheck, lint, the whole test suite (and the step's own test files must pass),
 * production build, real-database tests when the step requires them, and manual
 * QA notes when the step lists manual checks. Evidence is written to the roadmap.
 * Never edit statuses to "done" or evidence by hand. Stop running Next.js servers
 * before verifying (the build shares the .next folder).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "docs/roadmap/roadmap.json");
const README = path.join(ROOT, "docs/roadmap/README.md");
const TESTED_KINDS = ["feature", "ui", "infra", "security"];
const ICON = { done: "✅", in_progress: "🔨", next: "⭐", pending: "⏳", blocked: "⛔", future: "🔭" };
const LABEL = { done: "Done", in_progress: "In progress", next: "Next pick", pending: "Pending", blocked: "Blocked", future: "Future" };

const load = () => JSON.parse(readFileSync(FILE, "utf8"));
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function save(roadmap) {
  roadmap.updatedAt = now();
  writeFileSync(FILE, `${JSON.stringify(roadmap, null, 2)}\n`);
  render(roadmap);
}

function die(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function stepOrDie(roadmap, id) {
  const step = roadmap.steps.find((s) => s.id === id);
  if (!step) die(`Unknown step "${id}". Run \`npm run roadmap\` to list steps.`);
  return step;
}

function run(name, command, args, options = {}) {
  const started = Date.now();
  process.stdout.write(`  ▸ ${name.padEnd(10)} `);
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...options.env }, maxBuffer: 64 * 1024 * 1024 });
  const durationMs = Date.now() - started;
  const passed = result.status === 0;
  console.log(`${passed ? "passed" : "FAILED"} (${Math.round(durationMs / 1000)}s)`);
  if (!passed) {
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n");
    console.log(output.replace(/npg_[A-Za-z0-9]+/g, "***"));
  }
  return { passed, durationMs, stdout: result.stdout ?? "" };
}

function vitestJson(name, files, env = {}) {
  const out = path.join(mkdtempSync(path.join(tmpdir(), "roadmap-")), "vitest.json");
  const args = [path.join(ROOT, "node_modules/vitest/vitest.mjs"), "run", ...files, "--reporter=json", `--outputFile=${out}`];
  const nodeArgs = env.__envFile ? [`--env-file=${env.__envFile}`, ...args] : args;
  delete env.__envFile;
  const result = run(name, process.execPath, nodeArgs, { env });
  const report = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  const perFile = new Map();
  for (const file of report?.testResults ?? []) {
    const rel = path.relative(ROOT, file.name);
    const passed = file.assertionResults.filter((a) => a.status === "passed").length;
    const failed = file.assertionResults.filter((a) => a.status === "failed").length;
    perFile.set(rel, { passed, failed });
  }
  const summary = report ? `${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numPendingTests} skipped` : "no report";
  return { ...result, passed: result.passed && Boolean(report?.success), perFile, summary };
}

function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

/** Next.js dev/start servers for THIS repo (they share .next with the build). */
function runningNextServers() {
  if (process.platform === "win32") return [];
  const r = spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" });
  return (r.stdout ?? "")
    .split("\n")
    .filter((line) => line.includes(ROOT) && /node_modules\/(\.bin\/next|next\/dist\/bin\/next) (dev|start)/.test(line))
    .map((line) => line.trim());
}

function preflight(roadmap, targets, qaNotes) {
  const servers = runningNextServers();
  if (servers.length) {
    die(`A Next.js server for this project is running:\n    ${servers.join("\n    ")}\n  The QA gate runs a production build into .next, which would break that server.\n  Stop it (Ctrl+C in its terminal), run the gate, then start it again.`);
  }
  const byId = new Map(roadmap.steps.map((s) => [s.id, s]));
  const targetIds = new Set(targets.map((t) => t.id));
  for (const step of targets) {
    if (!step.acceptance?.length) die(`${step.id} has no acceptance criteria.`);
    if (TESTED_KINDS.includes(step.kind) && !step.tests?.length) {
      die(`${step.id} is a ${step.kind} step with no automated tests listed. Add test files to "tests" first.`);
    }
    for (const file of step.tests ?? []) if (!existsSync(path.join(ROOT, file))) die(`${step.id}: test file not found: ${file}`);
    const unfinished = (step.dependsOn ?? []).filter((d) => byId.get(d)?.status !== "done" && !targetIds.has(d));
    if (unfinished.length) die(`${step.id} depends on unfinished steps: ${unfinished.join(", ")}.`);
    if (step.status === "blocked") die(`${step.id} is blocked: ${step.blockedReason}`);
    if ((step.manualQa ?? []).length && (!qaNotes || qaNotes.trim().length < 20)) {
      die(`${step.id} requires manual QA:\n    - ${step.manualQa.join("\n    - ")}\n  Do these checks, then pass --qa "what you checked and the result" (≥ 20 chars).`);
    }
  }
}

function verify(argv) {
  const roadmap = load();
  const qaIndex = argv.indexOf("--qa");
  const qaNotes = qaIndex >= 0 ? argv[qaIndex + 1] : undefined;
  const allDone = argv.includes("--all-done");
  const ids = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--qa");
  const targets = allDone ? roadmap.steps.filter((s) => s.status === "done") : ids.map((id) => stepOrDie(roadmap, id));
  if (!targets.length) die("Nothing to verify. Usage: npm run roadmap:verify -- <ID> [--qa \"notes\"]  or  -- --all-done");
  for (const t of targets) if (!allDone && t.status === "done") console.log(`  (${t.id} is already done; re-verifying and refreshing evidence)`);

  preflight(roadmap, targets, qaNotes);
  console.log(`\nQA gate for ${targets.map((t) => t.id).join(", ")}\n`);

  const gateEnv = { ROADMAP_GATE_STEPS: targets.map((t) => t.id).join(",") };
  const checks = [];
  const typecheck = run("typecheck", "npm", ["run", "-s", "typecheck"]);
  checks.push({ name: "typecheck", ...typecheck, summary: "tsc --noEmit (strict)" });
  const lint = run("lint", "npx", ["eslint", ".", "--max-warnings=0"]);
  checks.push({ name: "lint", ...lint, summary: "eslint, 0 warnings" });
  const tests = vitestJson("tests", [], gateEnv);
  checks.push({ name: "tests", ...tests });
  const build = run("build", "npm", ["run", "-s", "build"]);
  checks.push({ name: "build", ...build, summary: "next build" });

  const perFile = new Map(tests.perFile);
  if (targets.some((t) => t.requiresDb)) {
    const envFile = path.join(ROOT, ".env.local");
    if (!existsSync(envFile)) die("A step requires database tests but .env.local is missing.");
    const dbFiles = targets.flatMap((t) => t.tests ?? []).filter((f) => f.endsWith(".db.test.ts"));
    const db = vitestJson("db tests", dbFiles, { RUN_DB_TESTS: "1", __envFile: envFile });
    checks.push({ name: "db tests", ...db });
    for (const [file, r] of db.perFile) perFile.set(file, r);
  }

  const failedChecks = checks.filter((c) => !c.passed).map((c) => c.name);
  const missing = [];
  for (const step of targets) {
    for (const file of step.tests ?? []) {
      const r = perFile.get(file);
      if (!r || r.passed === 0 || r.failed > 0) missing.push(`${step.id}: ${file} (${r ? `${r.passed} passed, ${r.failed} failed` : "did not run"})`);
    }
  }
  if (failedChecks.length || missing.length) {
    die(`QA gate FAILED. Nothing was ticked.\n${failedChecks.length ? `  Failed checks: ${failedChecks.join(", ")}\n` : ""}${missing.map((m) => `  Test file not passing: ${m}`).join("\n")}`);
  }

  const commit = git(["rev-parse", "--short=10", "HEAD"]) || "unknown0000";
  const dirty = git(["status", "--porcelain"]).length > 0;
  const verifiedAt = now();
  const fresh = load();
  for (const target of targets) {
    const step = stepOrDie(fresh, target.id);
    step.status = "done";
    delete step.blockedReason;
    step.evidence = {
      method: "qa-gate",
      verifiedAt,
      commit,
      dirty,
      checks: checks.map((c) => ({ name: c.name, passed: true, durationMs: c.durationMs, summary: c.summary })),
      testFiles: (step.tests ?? []).map((file) => ({ file, tests: perFile.get(file).passed })),
      ...(step.manualQa?.length ? { qaNotes } : {}),
    };
  }
  save(fresh);
  console.log(`\n✔ QA gate passed. Ticked: ${targets.map((t) => t.id).join(", ")} (commit ${commit}${dirty ? ", uncommitted changes" : ""}).`);
  if (!fresh.steps.some((s) => s.status === "next")) console.log("  No next pick is set. Choose one: npm run roadmap:next -- <ID>");
}

function start(id) {
  const roadmap = load();
  const step = stepOrDie(roadmap, id);
  if (step.status === "done") die(`${id} is already done.`);
  if (step.status === "blocked") die(`${id} is blocked: ${step.blockedReason}`);
  const unfinished = (step.dependsOn ?? []).filter((d) => roadmap.steps.find((s) => s.id === d)?.status !== "done");
  if (unfinished.length) die(`${id} depends on unfinished steps: ${unfinished.join(", ")}.`);
  step.status = "in_progress";
  step.startedAt = now();
  save(roadmap);
  console.log(`🔨 ${id} is now in progress. When finished: npm run roadmap:verify -- ${id}${step.manualQa?.length ? ' --qa "..."' : ""}`);
}

function next(id) {
  const roadmap = load();
  const step = stepOrDie(roadmap, id);
  if (["done", "in_progress", "blocked"].includes(step.status)) die(`${id} is ${step.status}; pick a pending or future step.`);
  for (const s of roadmap.steps) if (s.status === "next") s.status = "pending";
  step.status = "next";
  save(roadmap);
  console.log(`⭐ ${id} is the next pick.`);
}

function status() {
  const roadmap = load();
  const counts = Object.fromEntries(Object.keys(LABEL).map((k) => [k, 0]));
  for (const s of roadmap.steps) counts[s.status] += 1;
  const pct = Math.round((counts.done / roadmap.steps.length) * 100);
  console.log(`\n${roadmap.product} roadmap: ${counts.done}/${roadmap.steps.length} done (${pct}%)`);
  console.log(Object.entries(counts).map(([k, v]) => `${ICON[k]} ${LABEL[k]} ${v}`).join("   "));
  for (const phase of roadmap.phases) {
    console.log(`\n${phase.title}`);
    for (const s of roadmap.steps.filter((x) => x.phase === phase.id)) console.log(`  ${ICON[s.status]} ${s.id}  ${s.title}${s.status === "blocked" ? `  (blocked)` : ""}`);
  }
  console.log("");
}

function render(roadmap = load()) {
  const counts = Object.fromEntries(Object.keys(LABEL).map((k) => [k, 0]));
  for (const s of roadmap.steps) counts[s.status] += 1;
  const total = roadmap.steps.length;
  const pct = Math.round((counts.done / total) * 100);
  const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
  const lines = [
    `# ${roadmap.product} product roadmap`,
    "",
    "> **Generated from `docs/roadmap/roadmap.json` by `npm run roadmap:render`. Do not edit by hand.**",
    "> Steps are ticked ✅ only by the QA gate (`npm run roadmap:verify -- <ID>`). View it nicely at `/internal/roadmap`.",
    "",
    `**Progress:** \`${bar}\` ${counts.done} of ${total} steps done (${pct}%)`,
    "",
    Object.entries(counts).map(([k, v]) => `${ICON[k]} ${LABEL[k]}: **${v}**`).join(" · "),
    "",
  ];
  for (const phase of roadmap.phases) {
    const steps = roadmap.steps.filter((s) => s.phase === phase.id);
    const done = steps.filter((s) => s.status === "done").length;
    lines.push(`## ${phase.title} (${done}/${steps.length})`, "", `_${phase.goal}_`, "", "| | Step | Status | Verified |", "|---|---|---|---|");
    for (const s of steps) {
      const verified = s.evidence ? `${s.evidence.verifiedAt.slice(0, 10)} · \`${s.evidence.commit}\`` : s.status === "blocked" ? s.blockedReason : "";
      lines.push(`| ${s.status === "done" ? "☑" : "☐"} | **${s.id}** ${s.title} | ${ICON[s.status]} ${LABEL[s.status]} | ${verified} |`);
    }
    lines.push("");
  }
  lines.push("## Step details", "");
  for (const s of roadmap.steps) {
    lines.push(`### ${ICON[s.status]} ${s.id} · ${s.title}`, "", s.summary, "", `**Status:** ${LABEL[s.status]}${s.dependsOn?.length ? ` · **Depends on:** ${s.dependsOn.join(", ")}` : ""}`, "", "**Acceptance criteria**", "");
    for (const a of s.acceptance) lines.push(`- ${s.status === "done" ? "[x]" : "[ ]"} ${a}`);
    if (s.tests?.length) lines.push("", `**Tests:** ${s.tests.map((t) => `\`${t}\``).join(", ")}`);
    if (s.manualQa?.length) lines.push("", `**Manual QA:** ${s.manualQa.join("; ")}`);
    if (s.evidence) {
      lines.push("", `**Evidence:** verified ${s.evidence.verifiedAt} at \`${s.evidence.commit}\`${s.evidence.dirty ? " (uncommitted changes)" : ""}: ${s.evidence.checks.map((c) => `${c.name} ✓`).join(", ")}; ${s.evidence.testFiles.map((t) => `${path.basename(t.file)} ${t.tests} tests`).join(", ")}`);
      if (s.evidence.qaNotes) lines.push("", `**QA notes:** ${s.evidence.qaNotes}`);
    }
    lines.push("");
  }
  writeFileSync(README, `${lines.join("\n").trim()}\n`);
}

const [command = "status", ...rest] = process.argv.slice(2);
const commands = {
  status,
  render: () => {
    render();
    console.log("Rendered docs/roadmap/README.md");
  },
  start: () => start(rest[0] ?? die("Usage: npm run roadmap:start -- <ID>")),
  next: () => next(rest[0] ?? die("Usage: npm run roadmap:next -- <ID>")),
  verify: () => verify(rest),
};
(commands[command] ?? (() => die(`Unknown command "${command}".`)))();
