import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subDays, addDays } from "date-fns";

export { subDays, addDays };

export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Resolve YYYY-MM-DD for an instant in an IANA timezone. */
export function toDateStringInTimezone(date: Date, timezone: string): string {
  const tz = timezone?.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/** Get local date string YYYY-MM-DD */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar arithmetic on YYYY-MM-DD strings (timezone-neutral). */
export function subtractDaysFromDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function formatDisplayDate(dateStr: string, pattern = "MMM d"): string {
  return format(parseLocalDate(dateStr), pattern);
}

export function getWeekRange(date: Date, weekStartsOn = 0): { start: string; end: string } {
  const start = startOfWeek(date, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
  const end = endOfWeek(date, { weekStartsOn: weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
  return { start: toLocalDateString(start), end: toLocalDateString(end) };
}

export function getMonthRange(date: Date): { start: string; end: string } {
  return {
    start: toLocalDateString(startOfMonth(date)),
    end: toLocalDateString(endOfMonth(date)),
  };
}

export function getDaysInRange(startStr: string, endStr: string): string[] {
  const days = eachDayOfInterval({
    start: parseLocalDate(startStr),
    end: parseLocalDate(endStr),
  });
  return days.map(toLocalDateString);
}

export function getDayLabel(dateStr: string): string {
  return format(parseLocalDate(dateStr), "EEE").toUpperCase();
}

export function isToday(dateStr: string): boolean {
  return isSameDay(parseLocalDate(dateStr), new Date());
}

export function getRelativeDayLabel(dateStr: string): string {
  const today = toLocalDateString();
  const yesterday = toLocalDateString(subDays(new Date(), 1));
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return formatDisplayDate(dateStr, "EEEE");
}

export function daysBetween(startStr: string, endStr: string): number {
  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export function remainingDays(endStr: string): number {
  const end = parseLocalDate(endStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function formatTimeAgo(iso: string): string {
  const date = parseISO(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
