import { Decimal } from "decimal.js";

/** Parse a provider amount (decimal string or JSON number) to 2dp; null if absent/invalid. */
export function parseAmount(value: unknown): Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;
  // JSON numbers are converted via their shortest string form, then rounded to paise.
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return new Decimal(text).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function sumOrNull(values: (Decimal | null)[]): Decimal | null {
  let total = new Decimal(0);
  for (const value of values) {
    if (value === null) return null;
    total = total.add(value);
  }
  return total;
}
