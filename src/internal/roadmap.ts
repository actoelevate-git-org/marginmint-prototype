import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Product roadmap: the single source of truth is docs/roadmap/roadmap.json.
 * Steps are ticked "done" ONLY by `npm run roadmap:verify`, which runs the full
 * QA gate and records evidence. These schemas and integrity rules are shared by
 * the /internal portal and the test suite (which fails if the file is invalid).
 */
export const STEP_STATUSES = ["done", "in_progress", "next", "pending", "blocked", "future"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const STATUS_LABEL: Record<StepStatus, string> = {
  done: "Done",
  in_progress: "In progress",
  next: "Next pick",
  pending: "Pending",
  blocked: "Blocked",
  future: "Future",
};

export const STEP_KINDS = ["feature", "ui", "infra", "security", "docs", "ops", "research"] as const;
/** Kinds that must list automated test files before they can be ticked. */
export const TESTED_KINDS: readonly string[] = ["feature", "ui", "infra", "security"];

const checkSchema = z.object({
  name: z.string(),
  passed: z.literal(true),
  durationMs: z.number().int().nonnegative(),
  summary: z.string(),
});

const evidenceSchema = z.object({
  method: z.literal("qa-gate"),
  verifiedAt: z.string().datetime(),
  commit: z.string().min(7),
  dirty: z.boolean(),
  checks: z.array(checkSchema).min(4),
  testFiles: z.array(z.object({ file: z.string(), tests: z.number().int().positive() })),
  qaNotes: z.string().optional(),
});

const stepSchema = z.object({
  id: z.string().regex(/^[A-Z]-\d{2}$/),
  phase: z.string(),
  title: z.string().min(3),
  summary: z.string().min(20),
  status: z.enum(STEP_STATUSES),
  kind: z.enum(STEP_KINDS),
  dependsOn: z.array(z.string()).default([]),
  acceptance: z.array(z.string().min(5)).min(1),
  tests: z.array(z.string()).default([]),
  manualQa: z.array(z.string()).default([]),
  requiresDb: z.boolean().default(false),
  blockedReason: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  evidence: evidenceSchema.optional(),
});

export const roadmapSchema = z.object({
  version: z.literal(1),
  product: z.string(),
  updatedAt: z.string().datetime(),
  phases: z.array(z.object({ id: z.string(), title: z.string(), goal: z.string() })).min(1),
  steps: z.array(stepSchema).min(1),
});

export type Roadmap = z.infer<typeof roadmapSchema>;
export type RoadmapStep = z.infer<typeof stepSchema>;

export const ROADMAP_PATH = "docs/roadmap/roadmap.json";

export function loadRoadmap(root = process.cwd()): Roadmap {
  return roadmapSchema.parse(JSON.parse(readFileSync(path.join(root, ROADMAP_PATH), "utf8")));
}

/**
 * Integrity rules beyond the schema. Returns human-readable problems (empty = valid).
 * `beingVerified`: steps the QA gate is verifying right now; their evidence is
 * written after the gate passes, so evidence rules are skipped for them only.
 */
export function roadmapIssues(roadmap: Roadmap, root = process.cwd(), beingVerified: ReadonlySet<string> = new Set()): string[] {
  const issues: string[] = [];
  const byId = new Map(roadmap.steps.map((s) => [s.id, s]));
  const phaseIds = new Set(roadmap.phases.map((p) => p.id));
  if (byId.size !== roadmap.steps.length) issues.push("Step ids must be unique.");
  const nextPicks = roadmap.steps.filter((s) => s.status === "next");
  if (nextPicks.length > 1) issues.push(`Only one step may be the next pick (found ${nextPicks.map((s) => s.id).join(", ")}).`);

  for (const step of roadmap.steps) {
    const where = `${step.id} (${step.title})`;
    if (!phaseIds.has(step.phase)) issues.push(`${where}: unknown phase "${step.phase}".`);
    for (const dep of step.dependsOn) {
      if (!byId.has(dep)) issues.push(`${where}: depends on unknown step ${dep}.`);
      if (dep === step.id) issues.push(`${where}: depends on itself.`);
    }
    for (const file of step.tests) {
      if (!existsSync(path.join(root, file))) issues.push(`${where}: test file not found: ${file}.`);
    }
    if (step.status === "blocked" && !step.blockedReason) issues.push(`${where}: blocked steps need a blockedReason.`);
    if (step.status !== "done" && step.evidence) issues.push(`${where}: only done steps may carry evidence.`);
    if (step.status === "done" || step.status === "in_progress") {
      const unfinished = step.dependsOn.filter((d) => byId.get(d)?.status !== "done");
      if (unfinished.length) issues.push(`${where}: is ${step.status} but depends on unfinished ${unfinished.join(", ")}.`);
    }
    if (step.status === "done" && !beingVerified.has(step.id)) {
      if (!step.evidence) issues.push(`${where}: done without QA-gate evidence. Tick steps only with \`npm run roadmap:verify\`.`);
      if (TESTED_KINDS.includes(step.kind) && step.tests.length === 0) issues.push(`${where}: ${step.kind} steps need automated tests before they can be done.`);
      if (step.manualQa.length > 0 && !step.evidence?.qaNotes) issues.push(`${where}: manual QA notes are required.`);
      const verified = new Set(step.evidence?.testFiles.map((t) => t.file));
      for (const file of step.tests) if (!verified.has(file)) issues.push(`${where}: evidence does not include passing results for ${file}.`);
    }
  }

  // Dependency cycles
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string, trail: string[]): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      issues.push(`Dependency cycle: ${[...trail, id].join(" → ")}.`);
      return;
    }
    visiting.add(id);
    for (const dep of byId.get(id)?.dependsOn ?? []) visit(dep, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const step of roadmap.steps) visit(step.id, []);
  return issues;
}

export function roadmapProgress(roadmap: Roadmap) {
  const counts = Object.fromEntries(STEP_STATUSES.map((s) => [s, 0])) as Record<StepStatus, number>;
  for (const step of roadmap.steps) counts[step.status] += 1;
  const total = roadmap.steps.length;
  return { counts, total, percentDone: total ? Math.round((counts.done / total) * 100) : 0 };
}
