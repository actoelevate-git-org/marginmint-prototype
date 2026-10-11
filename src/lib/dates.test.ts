import { describe, expect, it } from "vitest";
import { dayKeyOf, eachDay, previousEquivalentRange, rangeLength, resolveDateRange, weekStartOf } from "./dates";

const today = "2026-10-11";

describe("date ranges", () => {
  it("resolves presets to whole inclusive IST days ending today", () => {
    expect(resolveDateRange({ preset: "today", today })).toMatchObject({ startDay: today, endDay: today });
    const r7 = resolveDateRange({ preset: "7d", today });
    expect(r7.startDay).toBe("2026-10-05");
    expect(rangeLength(r7)).toBe(7);
    expect(eachDay(resolveDateRange({ preset: "30d", today }))).toHaveLength(30);
  });

  it("accepts a valid custom range and clamps the end to today", () => {
    expect(resolveDateRange({ preset: "custom", today, start: "2026-09-01", end: "2026-12-01" })).toMatchObject({
      preset: "custom",
      startDay: "2026-09-01",
      endDay: today,
    });
  });

  it("falls back to 30 days for invalid custom input", () => {
    for (const [start, end] of [["2026-10-05", "2026-10-01"], ["2026-02-30", "2026-03-01"], ["nope", today], [undefined, undefined]]) {
      expect(resolveDateRange({ preset: "custom", today, start, end }).preset).toBe("30d");
    }
  });

  it("builds the previous equivalent range", () => {
    const prev = previousEquivalentRange(resolveDateRange({ preset: "7d", today }));
    expect(prev).toMatchObject({ startDay: "2026-09-28", endDay: "2026-10-04" });
  });

  it("buckets instants by IST calendar day", () => {
    expect(dayKeyOf("2026-10-10T18:29:00.000Z")).toBe("2026-10-10");
    expect(dayKeyOf("2026-10-10T18:30:00.000Z")).toBe("2026-10-11");
  });

  it("uses Monday-start weeks", () => {
    expect(weekStartOf("2026-10-11")).toBe("2026-10-05");
    expect(weekStartOf("2026-10-05")).toBe("2026-10-05");
  });
});
