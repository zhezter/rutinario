import { subDays, format } from 'date-fns';
import { eq, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, completions, domains, procedures, routines, systems } from '@/db/schema';
import { dateKey } from '@/lib/dates';

const WEEK_WINDOW = 6;
const CALENDAR_WINDOW = 55;

export type DayStat = {
  date: string;
  label: string;
  completed: number;
  expected: number;
  pct: number;
  isToday: boolean;
};

export type CalendarDay = {
  date: string;
  pct: number;
  isToday: boolean;
};

export type DomainStat = {
  name: string;
  completed: number;
  expected: number;
  pct: number;
};

export type StatsSnapshot = {
  streak: number;
  weekCompleted: number;
  days: DayStat[];
  calendar: CalendarDay[];
  domains: DomainStat[];
};

async function loadDailyActionIds(): Promise<Set<number>> {
  const rows = await db
    .select({ id: actions.id })
    .from(actions)
    .where(eq(actions.frequencyType, 'daily'));
  return new Set(rows.map((row) => row.id));
}

async function loadDomainByAction(): Promise<Map<number, string>> {
  const rows = await db
    .select({ actionId: actions.id, domainName: domains.name })
    .from(actions)
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .innerJoin(systems, eq(routines.systemId, systems.id))
    .innerJoin(domains, eq(systems.domainId, domains.id));
  return new Map(rows.map((row) => [row.actionId, row.domainName]));
}

export async function getStatsSnapshot(today = new Date()): Promise<StatsSnapshot> {
  const weekStartKey = dateKey(subDays(today, WEEK_WINDOW));
  const calendarStartKey = dateKey(subDays(today, CALENDAR_WINDOW));

  const [dailyIds, domainByAction, comps] = await Promise.all([
    loadDailyActionIds(),
    loadDomainByAction(),
    db.select().from(completions).where(gte(completions.date, calendarStartKey)),
  ]);

  const compDates = new Set<string>();
  const compsByDate = new Map<string, number[]>();
  for (const c of comps) {
    compDates.add(c.date);
    if (!dailyIds.has(c.actionId)) continue;
    const ids = compsByDate.get(c.date) ?? [];
    ids.push(c.actionId);
    compsByDate.set(c.date, ids);
  }

  let cursor = today;
  if (!compDates.has(dateKey(cursor))) cursor = subDays(cursor, 1);
  let streak = 0;
  while (compDates.has(dateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  const expectedTotal = dailyIds.size;
  const pctFor = (date: Date) => {
    const completed = compsByDate.get(dateKey(date))?.length ?? 0;
    return expectedTotal > 0 ? Math.min(100, Math.round((completed / expectedTotal) * 100)) : 0;
  };

  const days: DayStat[] = [];
  for (let i = WEEK_WINDOW; i >= 0; i -= 1) {
    const d = subDays(today, i);
    days.push({
      date: dateKey(d),
      label: format(d, 'EEE'),
      completed: compsByDate.get(dateKey(d))?.length ?? 0,
      expected: expectedTotal,
      pct: pctFor(d),
      isToday: i === 0,
    });
  }

  const calendar: CalendarDay[] = [];
  for (let i = CALENDAR_WINDOW; i >= 0; i -= 1) {
    const d = subDays(today, i);
    calendar.push({ date: dateKey(d), pct: pctFor(d), isToday: i === 0 });
  }

  const weekCompleted = comps.filter((c) => c.date >= weekStartKey).length;

  const domainAgg = new Map<string, { completed: number; expected: number }>();
  for (const [actionId, domainName] of domainByAction) {
    if (!dailyIds.has(actionId)) continue;
    const agg = domainAgg.get(domainName) ?? { completed: 0, expected: 0 };
    agg.expected += 1;
    domainAgg.set(domainName, agg);
  }
  for (const [date, ids] of compsByDate) {
    if (date < weekStartKey) continue;
    for (const actionId of ids) {
      const domainName = domainByAction.get(actionId);
      if (!domainName) continue;
      const agg = domainAgg.get(domainName);
      if (agg) agg.completed += 1;
    }
  }

  const domainStats: DomainStat[] = [...domainAgg.entries()]
    .map(([name, { completed, expected }]) => ({
      name,
      completed,
      expected,
      pct: expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0,
    }))
    .sort((a, b) => b.pct - a.pct || b.expected - a.expected);

  return {
    streak,
    weekCompleted,
    days,
    calendar,
    domains: domainStats,
  };
}
