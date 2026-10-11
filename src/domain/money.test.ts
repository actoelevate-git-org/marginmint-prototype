import { describe, expect, it } from "vitest";
import { formatInr, formatInrCompact, formatPercent, groupIndian, Money } from "./money";
import { Decimal } from "decimal.js";

describe("Money", () => {
  it("adds and subtracts in exact minor units", () => {
    const a = Money.fromMajor("0.10");
    const b = Money.fromMajor("0.20");
    expect(a.add(b).minor.toString()).toBe("30");
    expect(Money.fromMajor("100").sub(Money.fromMajor("100.01")).minor.toString()).toBe("-1");
  });

  it("rounds multiplication to whole paise, half-up", () => {
    expect(Money.fromMinor(1).mul("0.5").minor.toString()).toBe("1");
    expect(Money.fromMinor(3).mul(new Decimal(1).div(3)).minor.toString()).toBe("1");
  });
});

describe("formatInr", () => {
  it("uses Indian digit grouping", () => {
    expect(groupIndian("1234567")).toBe("12,34,567");
    expect(groupIndian("999")).toBe("999");
    expect(formatInr(Money.fromMajor("12345678.9"))).toBe("₹1,23,45,678.90");
  });

  it("rounds half-up at currency precision for whole-rupee display", () => {
    expect(formatInr(Money.fromMinor(150), { decimals: 0 })).toBe("₹2");
    expect(formatInr(Money.fromMinor(149), { decimals: 0 })).toBe("₹1");
  });

  it("formats negatives with a true minus and never shows −₹0", () => {
    expect(formatInr(Money.fromMajor("-4200"), { decimals: 0 })).toBe("−₹4,200");
    expect(formatInr(Money.fromMinor(-20), { decimals: 0 })).toBe("₹0");
  });

  it("shows unknown values as a fallback, not zero", () => {
    expect(formatInr(null)).toBe("—");
    expect(formatInr(null, { fallback: "Unknown" })).toBe("Unknown");
  });

  it("formats compact values", () => {
    expect(formatInrCompact(Money.fromMajor("950"))).toBe("₹950");
    expect(formatInrCompact(Money.fromMajor("12400"))).toBe("₹12.4K");
    expect(formatInrCompact(Money.fromMajor("320000"))).toBe("₹3.2L");
    expect(formatInrCompact(Money.fromMajor("-11000000"))).toBe("−₹1.1Cr");
  });

  it("formats percentages", () => {
    expect(formatPercent(new Decimal("17.04"))).toBe("17.0%");
    expect(formatPercent(new Decimal("-3.25"))).toBe("−3.3%");
    expect(formatPercent(null)).toBe("—");
  });
});
