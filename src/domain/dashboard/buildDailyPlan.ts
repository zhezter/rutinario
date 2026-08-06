import { isDueToday, frequencyLabel } from '../scheduling/frequency';
import { anchorLabel, inferTimeBlock } from '../scheduling/anchors';
import type {
  ActionRow,
  ActiveLevel,
  CategoryProgress,
  DailyPlan,
  DailyPlanItem,
} from './types';
import { dateKey } from '@/lib/dates';

const LEVEL_RANK: Record<ActionRow['minViableLevel'], number> = {
  essential: 0,
  standard: 1,
  full: 2,
};

const ACTIVE_LEVEL_RANK: Record<ActiveLevel, number> = {
  minimum: 0,
  standard: 1,
  full: 2,
};

function isVisible(action: ActionRow, level: ActiveLevel): boolean {
  return LEVEL_RANK[action.minViableLevel] <= ACTIVE_LEVEL_RANK[level];
}

function isScheduledToday(row: ActionRow, today: Date): boolean {
  const todayKey = dateKey(today);
  const doneToday = row.completions.some((c) => c.date === todayKey);
  return isDueToday(row, row.completions, today) || doneToday;
}

function existedOn(row: ActionRow, date: Date): boolean {
  return dateKey(new Date(row.createdAt)) <= dateKey(date);
}

export function buildDailyPlan(
  rows: ActionRow[],
  today: Date,
  level: ActiveLevel = 'standard',
): DailyPlan {
  const todayKey = dateKey(today);

  const items: DailyPlanItem[] = rows
    .filter(
      (row) =>
        isVisible(row, level) &&
        isScheduledToday(row, today) &&
        existedOn(row, today),
    )
    .map((row) => {
      const completion = row.completions.find((c) => c.date === todayKey) ?? null;
      return {
        actionId: row.id,
        name: row.name,
        description: row.description,
        durationMin: row.durationMin,
        scheduleType: row.scheduleType,
        fixedTime: row.fixedTime,
        anchor: anchorLabel(row.anchorType, row.anchorTarget),
        frequency: frequencyLabel(row),
        product: row.product,
        minViableLevel: row.minViableLevel,
        timeBlock: inferTimeBlock({
          scheduleType: row.scheduleType,
          fixedTime: row.fixedTime,
          anchorType: row.anchorType,
          anchorTarget: row.anchorTarget,
          routineName: row.procedure.routine.name,
        }),
        domainName: row.procedure.routine.system.domain.name,
        systemName: row.procedure.routine.system.name,
        routineId: row.procedure.routine.id,
        routineName: row.procedure.routine.name,
        completed: completion !== null,
        completedAt: completion?.completedAt ?? null,
        completionId: completion?.id ?? null,
      };
    })
    .sort((a, b) => {
      const blockOrder = a.timeBlock.localeCompare(b.timeBlock);
      if (blockOrder !== 0) return blockOrder;
      const timeA = a.fixedTime ?? '';
      const timeB = b.fixedTime ?? '';
      return timeA.localeCompare(timeB);
    });

  const categories: CategoryProgress[] = aggregateCategories(items);

  const plannedMinutes = sum(items.map((i) => i.durationMin ?? 0));
  const completedMinutes = sum(items.filter((i) => i.completed).map((i) => i.durationMin ?? 0));

  return { date: todayKey, items, categories, plannedMinutes, completedMinutes };
}

function aggregateCategories(items: DailyPlanItem[]): CategoryProgress[] {
  const map = new Map<string, CategoryProgress>();

  for (const item of items) {
    const existing = map.get(item.domainName);
    if (!existing) {
      map.set(item.domainName, {
        domainName: item.domainName,
        completed: item.completed ? 1 : 0,
        total: 1,
        plannedMinutes: item.durationMin ?? 0,
        completedMinutes: item.completed ? (item.durationMin ?? 0) : 0,
      });
      continue;
    }
    existing.total += 1;
    if (item.completed) existing.completed += 1;
    existing.plannedMinutes += item.durationMin ?? 0;
    if (item.completed) existing.completedMinutes += item.durationMin ?? 0;
  }

  return [...map.values()];
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export function formatMinutes(total: number): string {
  if (total <= 0) return '0m';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
