import { z } from "zod";

/**
 * Calendar handling.
 *
 * All business days are bucketed in India Standard Time and represented as
 * `DayKey` strings (YYYY-MM-DD). Ranges are inclusive on both ends and compare
 * day keys, never wall-clock instants, so a "7 days" range always covers seven
 * whole IST days regardless of the server's own timezone.
 */
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

export type DayKey = string;

export const PRESET_RANGES = ["today", "7d", "30d", "90d", "custom"] as const;
export type DatePreset = (typeof PRESET_RANGES)[number];

export const PRESET_LABEL: Record<DatePreset, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  custom: "Custom",
};

const PRESET_DAYS: Record<Exclude<DatePreset, "custom">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const MAX_CUSTOM_RANGE_DAYS = 366;

export type DateRange = {
  preset: DatePreset;
  startDay: DayKey;
  endDay: DayKey;
};

export const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDayKey, "Invalid calendar date");

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** IST calendar day of an ISO instant. */
export function dayKeyOf(iso: string): DayKey {
  return dayKeyFormatter.format(new Date(iso));
}

function isValidDayKey(key: string): boolean {
  const date = new Date(`${key}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key;
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (to − from). */
export function diffDays(from: DayKey, to: DayKey): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

export function rangeLength(range: DateRange): number {
  return diffDays(range.startDay, range.endDay) + 1;
}

export function eachDay(range: DateRange): DayKey[] {
  const days: DayKey[] = [];
  for (let key = range.startDay; key <= range.endDay; key = addDays(key, 1)) {
    days.push(key);
  }
  return days;
}

export function isDayInRange(day: DayKey, range: DateRange): boolean {
  return day >= range.startDay && day <= range.endDay;
}

export function isInstantInRange(iso: string, range: DateRange): boolean {
  return isDayInRange(dayKeyOf(iso), range);
}

export function resolveDateRange(args: {
  preset: DatePreset;
  today: DayKey;
  start?: string;
  end?: string;
}): DateRange {
  if (args.preset === "custom") {
    const start = dayKeySchema.safeParse(args.start);
    const end = dayKeySchema.safeParse(args.end);
    if (start.success && end.success) {
      const endDay = end.data > args.today ? args.today : end.data;
      const startDay = start.data;
      const length = diffDays(startDay, endDay) + 1;
      if (length >= 1 && length <= MAX_CUSTOM_RANGE_DAYS) {
        return { preset: "custom", startDay, endDay };
      }
    }
    // Invalid custom input falls back to the default preset rather than guessing.
    return resolveDateRange({ preset: "30d", today: args.today });
  }
  const days = PRESET_DAYS[args.preset];
  return { preset: args.preset, startDay: addDays(args.today, -(days - 1)), endDay: args.today };
}

/** The immediately preceding range of identical length. */
export function previousEquivalentRange(range: DateRange): DateRange {
  const length = rangeLength(range);
  const endDay = addDays(range.startDay, -1);
  return { preset: range.preset, startDay: addDays(endDay, -(length - 1)), endDay };
}

/** Monday-start week key for weekly grouping. */
export function weekStartOf(day: DayKey): DayKey {
  const date = new Date(`${day}T00:00:00.000Z`);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(day, -weekday);
}

const shortDayFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const longDayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const instantFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BUSINESS_TIME_ZONE,
});

export function formatDayShort(day: DayKey): string {
  return shortDayFormatter.format(new Date(`${day}T00:00:00.000Z`));
}

export function formatDayLong(day: DayKey): string {
  return longDayFormatter.format(new Date(`${day}T00:00:00.000Z`));
}

/** Instant rendered in IST, e.g. "11 Oct 2026, 14:10 IST". */
export function formatInstantIst(iso: string): string {
  return `${instantFormatter.format(new Date(iso))} IST`;
}

export function describeRange(range: DateRange): string {
  if (range.startDay === range.endDay) return formatDayLong(range.startDay);
  return `${formatDayShort(range.startDay)} – ${formatDayLong(range.endDay)}`;
}
