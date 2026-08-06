import { format } from 'date-fns';
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, completions, procedures, routines } from '@/db/schema';

export type BestTimeSuggestion = {
  actionId: number;
  actionName: string;
  routineId: number;
  routineName: string;
  hour: number;
  completions: number;
  bestCount: number;
};

const MIN_COMPLETIONS = 3;
const MAX_SUGGESTIONS = 10;

export async function getBestTimeSuggestions(): Promise<BestTimeSuggestion[]> {
  const rows = await db
    .select({
      actionId: actions.id,
      actionName: actions.name,
      routineId: routines.id,
      routineName: routines.name,
      completedAt: completions.completedAt,
    })
    .from(completions)
    .innerJoin(actions, eq(completions.actionId, actions.id))
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .where(eq(actions.frequencyType, 'daily'))
    .orderBy(completions.completedAt);

  const perAction = new Map<
    number,
    { actionId: number; actionName: string; routineId: number; routineName: string; hours: number[] }
  >();
  for (const row of rows) {
    const entry = perAction.get(row.actionId) ?? {
      actionId: row.actionId,
      actionName: row.actionName,
      routineId: row.routineId,
      routineName: row.routineName,
      hours: [],
    };
    entry.hours.push(new Date(row.completedAt).getHours());
    perAction.set(row.actionId, entry);
  }

  const suggestions: BestTimeSuggestion[] = [];
  for (const entry of perAction.values()) {
    const total = entry.hours.length;
    if (total < MIN_COMPLETIONS) continue;

    const counts = new Map<number, number>();
    for (const hour of entry.hours) {
      counts.set(hour, (counts.get(hour) ?? 0) + 1);
    }
    let bestHour = -1;
    let bestCount = 0;
    for (const [hour, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestHour = hour;
      }
    }

    suggestions.push({
      actionId: entry.actionId,
      actionName: entry.actionName,
      routineId: entry.routineId,
      routineName: entry.routineName,
      hour: bestHour,
      completions: total,
      bestCount,
    });
  }

  suggestions.sort((a, b) => b.bestCount - a.bestCount || b.completions - a.completions);
  return suggestions.slice(0, MAX_SUGGESTIONS);
}

export function formatSuggestionHour(hour: number): string {
  return format(new Date(2000, 0, 1, hour), 'h a');
}
