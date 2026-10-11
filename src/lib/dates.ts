import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { Timeline } from "./types";

export const WEEK_STARTS_ON = 0 as const; // Sunday, as in monday.com's default

/** Local calendar date → `yyyy-MM-dd`. */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** `yyyy-MM-dd` → local midnight. Returns an invalid date for bad input. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

export function isValidISODate(iso: unknown): iso is string {
  return typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(fromISODate(iso).getTime());
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(fromISODate(iso), days));
}

export function diffDaysISO(a: string, b: string): number {
  return differenceInCalendarDays(fromISODate(a), fromISODate(b));
}

/** "Oct 12", or "Oct 12, 2027" outside the current year. */
export function formatDate(iso: string, now: Date = new Date()): string {
  const date = fromISODate(iso);
  if (Number.isNaN(date.getTime())) return "";
  return isSameYear(date, now) ? format(date, "MMM d") : format(date, "MMM d, yyyy");
}

/** "Oct 3 - 10", "Oct 28 - Nov 4", or with years when outside the current year. */
export function formatTimeline(timeline: Timeline, now: Date = new Date()): string {
  const start = fromISODate(timeline.start);
  const end = fromISODate(timeline.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const yearSuffix = isSameYear(start, now) && isSameYear(end, now) ? "" : `, ${format(end, "yyyy")}`;
  if (isSameDay(start, end)) return format(start, "MMM d") + yearSuffix;
  if (isSameMonth(start, end)) return `${format(start, "MMM d")} - ${format(end, "d")}${yearSuffix}`;
  if (isSameYear(start, end)) return `${format(start, "MMM d")} - ${format(end, "MMM d")}${yearSuffix}`;
  return `${format(start, "MMM d, yyyy")} - ${format(end, "MMM d, yyyy")}`;
}

/** Inclusive number of days in a timeline. */
export function timelineDays(timeline: Timeline): number {
  return diffDaysISO(timeline.end, timeline.start) + 1;
}

export function normalizeTimeline(a: string, b: string): Timeline {
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/** Compact relative time: "now", "5m", "3h", "2d", then a date. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const date = new Date(timestamp);
  return isSameYear(date, new Date(now)) ? format(date, "MMM d") : format(date, "MMM d, yyyy");
}

export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM d, yyyy, h:mm a");
}

export type DateBucket = "overdue" | "today" | "this_week" | "next_week" | "later" | "none";

export const DATE_BUCKET_LABELS: Record<DateBucket, string> = {
  overdue: "Past dates",
  today: "Today",
  this_week: "This week",
  next_week: "Next week",
  later: "Later",
  none: "Without a date",
};

export function dateBucket(iso: string | null | undefined, today: Date = new Date()): DateBucket {
  if (!iso || !isValidISODate(iso)) return "none";
  const date = fromISODate(iso);
  const diff = differenceInCalendarDays(date, today);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  const endThisWeek = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
  if (date <= endThisWeek) return "this_week";
  if (date <= addWeeks(endThisWeek, 1)) return "next_week";
  return "later";
}

export function isPast(iso: string, today: Date = new Date()): boolean {
  return differenceInCalendarDays(fromISODate(iso), today) < 0;
}

/** Weeks (arrays of 7 dates) covering the month that contains `month`. */
export function monthMatrix(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: WEEK_STARTS_ON });
  const weeks: Date[][] = [];
  let cursor = start;
  while (cursor <= end) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function weekdayLabels(): string[] {
  const start = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "EEE"));
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
