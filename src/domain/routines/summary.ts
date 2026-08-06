import { formatMinutes } from '@/domain/dashboard/buildDailyPlan';
import { frequencyLabel } from '@/domain/scheduling/frequency';
import type { FrequencyType, ViabilityLevel } from '@/db/schema';

export type RoutineAction = {
  durationMin: number | null;
  scheduleType: string;
  fixedTime: string | null;
  anchorType: string | null;
  anchorTarget: string | null;
  frequencyType: FrequencyType;
  frequencyValue: number | null;
  minViableLevel: ViabilityLevel;
  product: string | null;
};

export type RoutineSummary = {
  actionCount: number;
  durationMin: number;
  frequency: string;
  priority: 'Essential' | 'Standard' | 'Optional';
  triggers: string[];
  products: string[];
};

const PRIORITY_RANK: Record<ViabilityLevel, number> = {
  essential: 0,
  standard: 1,
  full: 2,
};

const FREQUENCY_RANK: Record<FrequencyType, number> = {
  daily: 0,
  n_per_day: 1,
  every_n_days: 2,
  n_per_week: 3,
  every_2_weeks: 4,
  monthly: 5,
  quarterly: 6,
  yearly: 7,
  as_needed: 8,
};

export function summarizeRoutine(actions: RoutineAction[]): RoutineSummary {
  let durationMin = 0;
  let priorityRank = Number.POSITIVE_INFINITY;
  const frequencyCounts = new Map<string, { count: number; rank: number; label: string }>();
  const triggers = new Set<string>();
  const products = new Set<string>();

  for (const action of actions) {
    durationMin += action.durationMin ?? 0;
    priorityRank = Math.min(priorityRank, PRIORITY_RANK[action.minViableLevel]);

    const freqKey = `${action.frequencyType}:${action.frequencyValue ?? ''}`;
    const label = frequencyLabel(action);
    const existing = frequencyCounts.get(freqKey);
    if (existing) {
      existing.count += 1;
    } else {
      frequencyCounts.set(freqKey, {
        count: 1,
        rank: FREQUENCY_RANK[action.frequencyType],
        label,
      });
    }

    if (action.scheduleType === 'fixed' && action.fixedTime) {
      triggers.add(action.fixedTime);
    }
    if (action.scheduleType === 'anchored' && action.anchorType && action.anchorTarget) {
      triggers.add(`${action.anchorType} ${action.anchorTarget}`);
    }
    if (action.product) products.add(action.product);
  }

  let frequency = '—';
  let bestCount = -1;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const entry of frequencyCounts.values()) {
    if (entry.count > bestCount || (entry.count === bestCount && entry.rank < bestRank)) {
      frequency = entry.label;
      bestCount = entry.count;
      bestRank = entry.rank;
    }
  }

  const priority: RoutineSummary['priority'] =
    priorityRank <= PRIORITY_RANK.essential
      ? 'Essential'
      : priorityRank <= PRIORITY_RANK.standard
        ? 'Standard'
        : 'Optional';

  return {
    actionCount: actions.length,
    durationMin,
    frequency,
    priority,
    triggers: [...triggers],
    products: [...products],
  };
}

export function durationLabel(totalMin: number): string | null {
  if (totalMin <= 0) return null;
  return `about ${formatMinutes(totalMin)}`;
}
