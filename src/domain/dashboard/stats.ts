import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { eq, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, completions, domains, procedures, routines, systems } from '@/db/schema';
import { dateKey } from '@/lib/dates';

const WEEK_WINDOW = 6;
const CALENDAR_WINDOW = 55;
const TREND_WEEKS = 8;
const LOAD_WINDOW = 61;

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

export type RoutineTrendStat = {
  routineId: number;
  routineName: string;
  domainName: string;
  weeks: (number | null)[];
};

export type StatsSnapshot = {
  streak: number;
  weekCompleted: number;
  days: DayStat[];
  calendar: CalendarDay[];
  domains: DomainStat[];
  routineTrend: RoutineTrendStat[];
};

type DailyActionMeta = {
  id: number;
  createdAt: number;
  routineId: number;
  routineName: string;
  domainName: string;
};

async function loadDailyActionMeta(): Promise<DailyActionMeta[]> {
  return db
    .select({
      id: actions.id,
      createdAt: actions.createdAt,
      routineId: routines.id,
      routineName: routines.name,
      domainName: domains.name,
    })
    .from(actions)
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .innerJoin(systems, eq(routines.systemId, systems.id))
    .innerJoin(domains, eq(systems.domainId, domains.id))
    .where(eq(actions.frequencyType, 'daily'));
}

export async function getStatsSnapshot(today = new Date()): Promise<StatsSnapshot> {
  const weekStartKey = dateKey(subDays(today, WEEK_WINDOW));
  const loadStartKey = dateKey(subDays(today, LOAD_WINDOW));

  const [dailyActions, comps] = await Promise.all([
    loadDailyActionMeta(),
    db.select().from(completions).where(gte(completions.date, loadStartKey)),
  ]);

  const dailyIds = new Set(dailyActions.map((a) => a.id));
  const domainByAction = new Map(dailyActions.map((a) => [a.id, a.domainName]));

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
  for (const domainName of domainByAction.values()) {
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
    routineTrend: computeRoutineTrend(dailyActions, compsByDate, today),
  };
}

function computeRoutineTrend(
  dailyActions: DailyActionMeta[],
  compsByDate: Map<string, number[]>,
  today: Date,
): RoutineTrendStat[] {
  const weekStartToday = startOfWeek(today, { weekStartsOn: 1 });

  const routineGroups = new Map<number, { name: string; domain: string; actions: DailyActionMeta[] }>();
  for (const action of dailyActions) {
    const group = routineGroups.get(action.routineId) ?? {
      name: action.routineName,
      domain: action.domainName,
      actions: [],
    };
    group.actions.push(action);
    routineGroups.set(action.routineId, group);
  }

  const stats: RoutineTrendStat[] = [];
  for (const [routineId, group] of routineGroups) {
    const weeks: (number | null)[] = [];
    for (let w = 0; w < TREND_WEEKS; w += 1) {
      const weekStart = subDays(weekStartToday, (TREND_WEEKS - 1 - w) * 7);
      const weekEnd = addDays(weekStart, 6);
      const startKey = dateKey(weekStart);
      const endKey = dateKey(weekEnd);

      let covered = 0;
      let done = 0;
      for (const action of group.actions) {
        const createdKey = dateKey(new Date(action.createdAt));
        if (createdKey > endKey) continue;
        const firstKey = createdKey < startKey ? startKey : createdKey;
        covered += differenceInCalendarDays(parseISO(endKey), parseISO(firstKey)) + 1;
        for (const [dayKey, ids] of compsByDate) {
          if (dayKey < startKey || dayKey > endKey) continue;
          if (ids.includes(action.id)) done += 1;
        }
      }

      weeks.push(
        covered > 0 ? Math.min(100, Math.round((done / covered) * 100)) : null,
      );
    }
    stats.push({ routineId, routineName: group.name, domainName: group.domain, weeks });
  }

  return stats.sort((a, b) => a.routineName.localeCompare(b.routineName));
}
