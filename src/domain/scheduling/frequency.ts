import type { FrequencyType } from '@/db/schema';

import { dateKey, daysBetween, thisWeekStart } from '@/lib/dates';

export type FrequencyInput = {
  frequencyType: FrequencyType;
  frequencyValue: number | null;
};

export type CompletionDate = {
  date: string;
};

export function isDueToday(
  action: FrequencyInput,
  completions: CompletionDate[],
  today: Date,
): boolean {
  const todayKey = dateKey(today);

  switch (action.frequencyType) {
    case 'daily':
      return !completions.some((c) => c.date === todayKey);

    case 'n_per_day': {
      const target = action.frequencyValue ?? 1;
      const countToday = completions.filter((c) => c.date === todayKey).length;
      return countToday < target;
    }

    case 'n_per_week': {
      const target = action.frequencyValue ?? 1;
      const weekStartKey = dateKey(thisWeekStart(today));
      const countThisWeek = completions.filter((c) => c.date >= weekStartKey).length;
      return countThisWeek < target;
    }

    case 'every_n_days': {
      const interval = action.frequencyValue ?? 2;
      return daysSinceLast(completions, today) >= interval;
    }

    case 'every_2_weeks':
      return daysSinceLast(completions, today) >= 14;

    case 'monthly':
      return daysSinceLast(completions, today) >= 28;

    case 'quarterly':
      return daysSinceLast(completions, today) >= 90;

    case 'yearly':
      return daysSinceLast(completions, today) >= 365;

    case 'as_needed':
      return false;
  }
}

function daysSinceLast(completions: CompletionDate[], today: Date): number {
  if (completions.length === 0) return Number.POSITIVE_INFINITY;
  const last = completions
    .map((c) => c.date)
    .sort()
    .at(-1)!;
  const [y, m, d] = last.split('-').map(Number);
  return daysBetween(today, new Date(y, m - 1, d));
}

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: 'Daily',
  n_per_day: '×/day',
  n_per_week: '×/week',
  every_n_days: 'every N days',
  every_2_weeks: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  as_needed: 'As needed',
};

export function frequencyLabel(action: FrequencyInput): string {
  const base = FREQUENCY_LABELS[action.frequencyType];
  if (action.frequencyValue == null) return base;
  return `${action.frequencyValue}× ${base}`;
}
