import { describe, expect, it } from "vitest";
import { loadRoadmap, roadmapIssues, roadmapProgress, roadmapSchema, type Roadmap } from "./roadmap";

const beingVerified = new Set((process.env.ROADMAP_GATE_STEPS ?? "").split(",").filter(Boolean));

const evidence = {
  method: "qa-gate" as const,
  verifiedAt: "2026-10-12T10:00:00Z",
  commit: "abcdef1234",
  dirty: false,
  checks: ["typecheck", "lint", "tests", "build"].map((name) => ({ name, passed: true as const, durationMs: 1, summary: "ok" })),
  testFiles: [{ file: "src/internal/roadmap.test.ts", tests: 3 }],
};

function fixture(steps: Partial<Roadmap["steps"][number]>[]): Roadmap {
  return roadmapSchema.parse({
    version: 1,
    product: "Test",
    updatedAt: "2026-10-12T10:00:00Z",
    phases: [{ id: "p", title: "P", goal: "g" }],
    steps: steps.map((s, i) => ({
      id: `X-${String(i + 1).padStart(2, "0")}`,
      phase: "p",
      title: "A step",
      summary: "A sufficiently long summary of the step.",
      status: "pending",
      kind: "docs",
      acceptance: ["Something observable happens"],
      ...s,
    })),
  });
}

describe("docs/roadmap/roadmap.json", () => {
  const roadmap = loadRoadmap();

  it("is valid: schema, dependencies, single next pick, and every done step carries passing QA-gate evidence", () => {
    expect(roadmapIssues(roadmap, process.cwd(), beingVerified)).toEqual([]);
  });

  it("covers the full product with a plausible status mix", () => {
    const { counts, total } = roadmapProgress(roadmap);
    expect(total).toBeGreaterThanOrEqual(40);
    expect(counts.done).toBeGreaterThan(0);
    expect(counts.pending + counts.future + counts.next + counts.blocked).toBeGreaterThan(0);
    for (const phase of roadmap.phases) expect(roadmap.steps.some((s) => s.phase === phase.id)).toBe(true);
  });
});

describe("roadmap integrity rules", () => {
  it("rejects a done step without gate evidence", () => {
    expect(roadmapIssues(fixture([{ status: "done" }]))).toEqual([expect.stringContaining("done without QA-gate evidence")]);
  });

  it("requires automated tests for feature steps and passing results for each listed file", () => {
    const noTests = fixture([{ status: "done", kind: "feature", evidence: { ...evidence, testFiles: [] } }]);
    expect(roadmapIssues(noTests).join()).toContain("need automated tests");
    const missingResult = fixture([{ status: "done", kind: "feature", tests: ["src/internal/roadmap.test.ts"], evidence: { ...evidence, testFiles: [] } }]);
    expect(roadmapIssues(missingResult).join()).toContain("does not include passing results");
  });

  it("requires manual QA notes when a step lists manual checks", () => {
    const step = fixture([{ status: "done", manualQa: ["Check mobile"], evidence }]);
    expect(roadmapIssues(step).join()).toContain("manual QA notes are required");
  });

  it("allows only one next pick, needs reasons for blocked steps, and forbids evidence on unfinished steps", () => {
    const issues = roadmapIssues(fixture([{ status: "next" }, { status: "next" }, { status: "blocked" }, { status: "pending", evidence }])).join("\n");
    expect(issues).toContain("Only one step may be the next pick");
    expect(issues).toContain("blocked steps need a blockedReason");
    expect(issues).toContain("only done steps may carry evidence");
  });

  it("rejects finished work on unfinished dependencies and dependency cycles", () => {
    const issues = roadmapIssues(fixture([{ status: "in_progress", dependsOn: ["X-02"] }, { status: "pending", dependsOn: ["X-01"] }])).join("\n");
    expect(issues).toContain("depends on unfinished X-02");
    expect(issues).toContain("Dependency cycle");
  });

  it("accepts a correctly verified step and excuses steps currently in the gate", () => {
    expect(roadmapIssues(fixture([{ status: "done", tests: ["src/internal/roadmap.test.ts"], evidence }]))).toEqual([]);
    expect(roadmapIssues(fixture([{ status: "done" }]), process.cwd(), new Set(["X-01"]))).toEqual([]);
  });
});
