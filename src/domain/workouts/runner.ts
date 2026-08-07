import { and, eq, inArray, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { exerciseLogs, workoutExercises } from '@/db/schema';

export type LoggedSet = {
  workoutExerciseId: number;
  setIndex: number;
  weightKg: number | null;
  reps: number;
  completedAt: number;
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getDayLogs(
  workoutExerciseIds: number[],
  date: Date,
): Promise<Map<number, LoggedSet[]>> {
  if (workoutExerciseIds.length === 0) return new Map();
  const dateKey = toDateKey(date);
  const rows = await db
    .select()
    .from(exerciseLogs)
    .where(and(eq(exerciseLogs.date, dateKey)));
  const bySlot = new Map<number, LoggedSet[]>();
  for (const row of rows) {
    if (!workoutExerciseIds.includes(row.workoutExerciseId)) continue;
    const list = bySlot.get(row.workoutExerciseId) ?? [];
    list.push(row);
    bySlot.set(row.workoutExerciseId, list);
  }
  return bySlot;
}

export async function recordSet(
  workoutExerciseId: number,
  date: Date,
  setIndex: number,
  weightKg: number | null,
  reps: number,
): Promise<void> {
  const dateKey = toDateKey(date);
  await db
    .insert(exerciseLogs)
    .values({
      workoutExerciseId,
      date: dateKey,
      setIndex,
      weightKg,
      reps,
    })
    .onConflictDoUpdate({
      target: [exerciseLogs.workoutExerciseId, exerciseLogs.date, exerciseLogs.setIndex],
      set: { weightKg, reps, completedAt: Date.now() },
    });
}

export async function clearSet(
  workoutExerciseId: number,
  date: Date,
  setIndex: number,
): Promise<void> {
  await db
    .delete(exerciseLogs)
    .where(
      and(
        eq(exerciseLogs.workoutExerciseId, workoutExerciseId),
        eq(exerciseLogs.date, toDateKey(date)),
        eq(exerciseLogs.setIndex, setIndex),
      ),
    );
}

export async function getExerciseBestWeight(exerciseId: number): Promise<number | null> {
  const rows = await db
    .select({ maxWeight: max(exerciseLogs.weightKg) })
    .from(exerciseLogs)
    .innerJoin(workoutExercises, eq(exerciseLogs.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.exerciseId, exerciseId));
  const value = rows[0]?.maxWeight ?? null;
  return value ?? null;
}

export async function getDaySessionCount(workoutExerciseIds: number[]): Promise<number> {
  if (workoutExerciseIds.length === 0) return 0;
  const rows = await db
    .select({ date: exerciseLogs.date })
    .from(exerciseLogs)
    .where(inArray(exerciseLogs.workoutExerciseId, workoutExerciseIds));
  return new Set(rows.map((row) => row.date)).size;
}

export const DEFAULT_INCREMENT_KG = 2.5;

export function suggestWeight(opts: {
  weightKg: number | null;
  incrementKg: number | null;
  sessionCount: number;
  cycleWeeks: number | null;
}): number | null {
  const { weightKg, incrementKg, sessionCount, cycleWeeks } = opts;
  if (weightKg == null) return null;
  const increment = incrementKg ?? DEFAULT_INCREMENT_KG;
  const maxSteps = cycleWeeks != null ? Math.max(0, cycleWeeks - 1) : Number.POSITIVE_INFINITY;
  const steps = Math.min(sessionCount, maxSteps);
  return Math.round((weightKg + increment * steps) * 10) / 10;
}
