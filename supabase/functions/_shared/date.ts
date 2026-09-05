/**
 * Resolve YYYY-MM-DD for an instant in an IANA timezone.
 * Matches the calendar date the client uses via toLocalDateString() in that zone.
 */
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

export function getLocalHourInTimezone(date: Date, timezone: string): number {
  const tz = timezone?.trim() || "UTC";
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(date);
    return Number(hour);
  } catch {
    return date.getUTCHours();
  }
}

export function subtractDaysFromDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function streakThroughYesterday(
  activities: { date: string; steps: number }[],
  goal: number,
  todayStr: string
): number {
  const byDate = new Map(activities.map((a) => [a.date, a.steps]));
  let streak = 0;
  let cursor = subtractDaysFromDateString(todayStr, 1);

  while (true) {
    const steps = byDate.get(cursor) ?? 0;
    if (steps >= goal) {
      streak++;
      cursor = subtractDaysFromDateString(cursor, 1);
    } else {
      break;
    }
  }
  return streak;
}
