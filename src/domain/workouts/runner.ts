import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { exerciseLogs } from '@/db/schema';

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
