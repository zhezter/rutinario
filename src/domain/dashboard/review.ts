import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { eq, gte } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, completions, domains, procedures, routines, systems } from '@/db/schema';
import { dateKey } from '@/lib/dates';

export type RoutineWeekStat = {
  routineId: number;
  routineName: string;
  domainName: string;
  expected: number;
  completed: number;
  pct: number;
};

export type ReviewDayStat = {
  date: string;
  label: string;
  completed: number;
  expected: number;
  pct: number;
};

export type WeekReview = {
  startKey: string;
  endKey: string;
  startLabel: string;
  endLabel: string;
  completed: number;
  expected: number;
  pct: number;
  days: ReviewDayStat[];
  bestDay: ReviewDayStat | null;
  worstDay: ReviewDayStat | null;
  routines: RoutineWeekStat[];
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

export async function getWeekReview(endDate: Date): Promise<WeekReview> {
  const weekStart = startOfWeek(endDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const startKey = dateKey(weekStart);
  const endKey = dateKey(weekEnd);
  const loadStartKey = dateKey(subDays(endDate, 59));

  const [dailyActions, comps] = await Promise.all([
    loadDailyActionMeta(),
    db.select().from(completions).where(gte(completions.date, loadStartKey)),
  ]);

  const compsByDate = new Map<string, number[]>();
  for (const c of comps) {
    if (c.date < startKey || c.date > endKey) continue;
    const ids = compsByDate.get(c.date) ?? [];
    ids.push(c.actionId);
    compsByDate.set(c.date, ids);
  }

  const days: ReviewDayStat[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = addDays(weekStart, i);
    const key = dateKey(d);
    const expected = dailyActions.filter((a) => dateKey(new Date(a.createdAt)) <= key).length;
    const completed = compsByDate.get(key)?.length ?? 0;
    days.push({
      date: key,
      label: format(d, 'EEE'),
      completed,
      expected,
      pct: expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0,
    });
  }

  const routineAgg = new Map<
    number,
    { name: string; domain: string; expected: number; completed: number }
  >();
  for (const action of dailyActions) {
    const createdKey = dateKey(new Date(action.createdAt));
    if (createdKey > endKey) continue;
    const firstKey = createdKey < startKey ? startKey : createdKey;
    const covered = differenceInCalendarDays(parseISO(endKey), parseISO(firstKey)) + 1;

    const agg = routineAgg.get(action.routineId) ?? {
      name: action.routineName,
      domain: action.domainName,
      expected: 0,
      completed: 0,
    };
    agg.expected += covered;
    for (const ids of compsByDate.values()) {
      if (ids.includes(action.id)) agg.completed += 1;
    }
    routineAgg.set(action.routineId, agg);
  }

  const routines: RoutineWeekStat[] = [...routineAgg.entries()]
    .map(([routineId, { name, domain, expected, completed }]) => ({
      routineId,
      routineName: name,
      domainName: domain,
      expected,
      completed,
      pct: expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0,
    }))
    .sort((a, b) => b.pct - a.pct || b.routineName.localeCompare(a.routineName));

  const withExpected = days.filter((d) => d.expected > 0);
  const bestDay =
    withExpected.length > 0
      ? withExpected.reduce((best, d) => (d.pct > best.pct ? d : best))
      : null;
  const worstDay =
    withExpected.length > 0
      ? withExpected.reduce((worst, d) => (d.pct < worst.pct ? d : worst))
      : null;

  const expected = days.reduce((sum, d) => sum + d.expected, 0);
  const completed = days.reduce((sum, d) => sum + d.completed, 0);

  return {
    startKey,
    endKey,
    startLabel: format(weekStart, 'MMM d'),
    endLabel: format(weekEnd, 'MMM d'),
    completed,
    expected,
    pct: expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0,
    days,
    bestDay,
    worstDay,
    routines,
  };
}
