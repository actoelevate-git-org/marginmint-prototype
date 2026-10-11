import { Decimal } from "decimal.js";

export const DEFAULT_CURRENCY = "INR" as const;
export const INR_PRECISION = 2;

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type CurrencyCode = typeof DEFAULT_CURRENCY;

/** Integer minor units (paise for INR). Authoritative stored representation. */
export type MinorUnits = number;

export class Money {
  readonly minor: Decimal;
  readonly currency: CurrencyCode;
  readonly precision: number;

  private constructor(minor: Decimal, currency: CurrencyCode, precision: number) {
    this.minor = minor;
    this.currency = currency;
    this.precision = precision;
  }

  static fromMinor(minor: MinorUnits | Decimal | string, currency: CurrencyCode = DEFAULT_CURRENCY): Money {
    return new Money(new Decimal(minor), currency, INR_PRECISION);
  }

  static fromMajor(major: Decimal | string | number, currency: CurrencyCode = DEFAULT_CURRENCY): Money {
    const scale = new Decimal(10).pow(INR_PRECISION);
    return new Money(new Decimal(major).mul(scale).toDecimalPlaces(0), currency, INR_PRECISION);
  }

  static zero(currency: CurrencyCode = DEFAULT_CURRENCY): Money {
    return Money.fromMinor(0, currency);
  }

  toMajor(): Decimal {
    const scale = new Decimal(10).pow(this.precision);
    return this.minor.div(scale);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.minor.add(other.minor), this.currency);
  }

  sub(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.minor.sub(other.minor), this.currency);
  }

  mul(factor: Decimal | number | string): Money {
    return Money.fromMinor(this.minor.mul(factor).toDecimalPlaces(0), this.currency);
  }

  isZero(): boolean {
    return this.minor.isZero();
  }

  isNegative(): boolean {
    return this.minor.isNegative();
  }

  abs(): Money {
    return Money.fromMinor(this.minor.abs(), this.currency);
  }

  cmp(other: Money): number {
    this.assertSameCurrency(other);
    return this.minor.cmp(other.minor);
  }

  toMinorNumber(): number {
    return this.minor.toNumber();
  }

  toJSON(): { minor: string; currency: CurrencyCode } {
    return { minor: this.minor.toFixed(0), currency: this.currency };
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

/** Indian digit grouping: 12,34,567. Operates on the digit string, never floats. */
export function groupIndian(whole: string): string {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/**
 * Display formatting for INR. `decimals: 0` rounds half-up to whole rupees for
 * dense dashboards; the stored value is unchanged.
 */
export function formatInr(
  money: Money | null | undefined,
  options?: { fallback?: string; decimals?: 0 | 2; signDisplay?: "auto" | "always" },
): string {
  if (!money) {
    return options?.fallback ?? "—";
  }
  const decimals = options?.decimals ?? INR_PRECISION;
  const rounded = money.toMajor().toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP);
  const sign = rounded.isNegative() && !rounded.isZero() ? "−" : options?.signDisplay === "always" && !rounded.isZero() ? "+" : "";
  const [wholeRaw = "0", fraction] = rounded.abs().toFixed(decimals).split(".");
  return `${sign}₹${groupIndian(wholeRaw)}${fraction ? `.${fraction}` : ""}`;
}

/** Compact INR for axes and chips: ₹950, ₹12.4K, ₹3.2L, ₹1.1Cr. */
export function formatInrCompact(money: Money | null | undefined, options?: { fallback?: string }): string {
  if (!money) return options?.fallback ?? "—";
  const major = money.toMajor();
  const sign = major.isNegative() && !major.isZero() ? "−" : "";
  const abs = major.abs();
  const units: [Decimal, string][] = [
    [new Decimal(10_000_000), "Cr"],
    [new Decimal(100_000), "L"],
    [new Decimal(1_000), "K"],
  ];
  for (const [size, suffix] of units) {
    if (abs.gte(size)) {
      const scaled = abs.div(size);
      return `${sign}₹${scaled.toDecimalPlaces(scaled.gte(100) ? 0 : 1).toString()}${suffix}`;
    }
  }
  return `${sign}₹${abs.toDecimalPlaces(0).toString()}`;
}

export function formatPercent(value: Decimal | null, digits = 1): string {
  if (value === null) {
    return "—";
  }
  const rounded = value.toDecimalPlaces(digits);
  const sign = rounded.isNegative() && !rounded.isZero() ? "−" : "";
  return `${sign}${rounded.abs().toFixed(digits)}%`;
}
