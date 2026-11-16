import "server-only";
import { tz } from "@date-fns/tz";
import {
  differenceInMinutes,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { connection } from "next/server";
import { getStudentRequests, type StudentRequest } from "@/lib/kaneo/requests";

/** All dates are grouped by Ulaanbaatar local time. */
const ub = { in: tz("Asia/Ulaanbaatar") };
const WEEK = { ...ub, weekStartsOn: 1 } as const; // weeks start on Monday
const dayKey = (d: Date) => format(d, "yyyy-MM-dd", ub);

export const PERIODS = {
  "7d": { label: "7 хоног", days: 7 },
  "1m": { label: "1 сар", days: 30 },
  "6m": { label: "6 сар", days: 182 },
} as const;
export type PeriodKey = keyof typeof PERIODS;

export type DayStat = { arrived: number; staff: number; ai: number };
export type Ranked = { label: string; value: number };

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(period: PeriodKey) {
  const all = await getStudentRequests();
  await connection(); // the rest depends on the current time, so run it per request
  const now = new Date();

  const from = startOfDay(subDays(now, PERIODS[period].days - 1), ub);
  const requests = all.filter((r) => !isAfter(from, r.createdAt));
  const resolved = requests.filter((r) => r.outcome === "resolved");
  const rejected = requests.filter((r) => r.outcome === "rejected");
  const overdue = requests.filter((r) => isOverdue(r, now));

  const days = dailyStats(all);
  const weekly = weeklyResolved(resolved, from, now);

  return {
    period,
    range: { from: format(from, "yyyy/MM/dd", ub), to: format(now, "yyyy/MM/dd", ub) },
    today: { label: format(now, "MM/dd", ub), ...(days.get(dayKey(now)) ?? emptyDay()) },
    kpi: {
      total: requests.length,
      resolved: resolved.length,
      rejected: rejected.length,
      overdue: overdue.length,
      avgDuration: averageDuration(requests),
    },
    weekly: period === "6m" ? weekly.slice(-12) : weekly,
    month: monthCalendar(days, now),
    topTypes: rank(requests.map((r) => r.type)),
    rejectReasons: rank(requests.flatMap((r) => r.rejectReasons)),
    overdueTypes: rank(overdue.map((r) => r.type)),
  };
}

/** Overdue = still open past its due date, or closed after it. */
function isOverdue(r: StudentRequest, now: Date) {
  return r.dueAt !== null && isAfter(r.closedAt ?? now, r.dueAt);
}

const emptyDay = (): DayStat => ({ arrived: 0, staff: 0, ai: 0 });

/** Per day: how many requests arrived, and how many were resolved by staff / AI. */
function dailyStats(requests: StudentRequest[]) {
  const days = new Map<string, DayStat>();
  const day = (d: Date) => {
    const key = dayKey(d);
    if (!days.has(key)) days.set(key, emptyDay());
    return days.get(key)!;
  };
  for (const r of requests) {
    day(r.createdAt).arrived++;
    if (r.outcome === "resolved" && r.closedAt) day(r.closedAt)[r.closedBy === "ai" ? "ai" : "staff"]++;
  }
  return days;
}

/** Resolved requests per Monday–Sunday week, by the day they were closed. */
function weeklyResolved(resolved: StudentRequest[], from: Date, now: Date) {
  return eachWeekOfInterval({ start: from, end: now }, WEEK).map((weekStart) => {
    const key = dayKey(weekStart);
    const inWeek = resolved.filter((r) => r.closedAt && dayKey(startOfWeek(r.closedAt, WEEK)) === key);
    return {
      week: `${format(weekStart, "MM/dd", ub)}–${format(endOfWeek(weekStart, WEEK), "MM/dd", ub)}`,
      ajiltan: inWeek.filter((r) => r.closedBy !== "ai").length,
      azaaAi: inWeek.filter((r) => r.closedBy === "ai").length,
    };
  });
}

/** The current month's days for the "Өдрийн гүйцэтгэл" heatmap. */
function monthCalendar(days: Map<string, DayStat>, now: Date) {
  const first = startOfMonth(now, ub);
  const monthDays = eachDayOfInterval({ start: first, end: endOfMonth(now, ub) }, ub);
  return {
    label: format(now, "yyyy/MM", ub),
    monthLabel: format(now, "MM", ub),
    today: Number(format(now, "d", ub)),
    daysInMonth: monthDays.length,
    /** 0 = Monday … 6 = Sunday */
    firstWeekday: Number(format(first, "i", ub)) - 1,
    /** day of month → stats (days without requests are missing) */
    days: Object.fromEntries(
      monthDays.flatMap((d) => {
        const s = days.get(dayKey(d));
        return s ? [[Number(format(d, "d", ub)), s]] : [];
      }),
    ) as Record<number, DayStat>,
  };
}

/** Average time from arrival to resolved/rejected, e.g. "26ц 36мин". */
function averageDuration(requests: StudentRequest[]): string | null {
  const minutes = requests
    .filter((r) => r.closedAt)
    .map((r) => differenceInMinutes(r.closedAt!, r.createdAt));
  if (minutes.length === 0) return null;
  const avg = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
  return `${Math.floor(avg / 60)}ц ${avg % 60}мин`;
}

/** Top 5 values by how often they appear. */
function rank(values: string[], top = 5): Ranked[] {
  const counts = Object.entries(Object.groupBy(values, (v) => v)).map(([label, items]) => ({
    label,
    value: items?.length ?? 0,
  }));
  return counts.sort((a, b) => b.value - a.value).slice(0, top);
}
