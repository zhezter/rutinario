import type { WorkoutDaySummary, WorkoutSummary } from '@/domain/workouts/types';
import { listWorkouts } from '@/domain/workouts/workouts';

export type TodaySlot = {
  workout: WorkoutSummary;
  day: WorkoutDaySummary;
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function weekdayLabel(weekday: number | null): string | null {
  if (weekday === null || weekday < 0 || weekday > 6) return null;
  return WEEKDAY_LABELS[weekday];
}

export function weekdayLabelShort(weekday: number | null): string | null {
  const label = weekdayLabel(weekday);
  return label ? label.slice(0, 3) : null;
}

export function weekdayOptions(): { value: number | null; label: string }[] {
  return WEEKDAY_LABELS.map((label, value) => ({ value, label }));
}

export function weekdayFromDate(date: Date): number {
  return date.getDay();
}

function firstWorkoutWithDay(workouts: WorkoutSummary[], weekday: number): TodaySlot | null {
  for (const workout of workouts) {
    const day = workout.days.find((candidate) => candidate.weekday === weekday);
    if (day && day.exercises.length > 0) return { workout, day };
  }
  return null;
}

export async function getTodayWorkout(date: Date = new Date()): Promise<TodaySlot | null> {
  const workouts = await listWorkouts();
  if (workouts.length === 0) return null;
  return firstWorkoutWithDay(workouts, date.getDay());
}
