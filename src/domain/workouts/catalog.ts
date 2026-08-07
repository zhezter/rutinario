import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { exercises, workoutExercises } from '@/db/schema';
import { getOrCreateExercise } from '@/domain/workouts/workouts';

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Full body',
] as const;

export type CatalogExercise = {
  id: number;
  name: string;
  muscleGroup: string | null;
  usageCount: number;
};

export async function listCatalogExercises(): Promise<CatalogExercise[]> {
  const rows = await db.query.exercises.findMany({
    with: { slots: true },
    orderBy: (rows, { asc }) => [asc(rows.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscleGroup,
    usageCount: row.slots.length,
  }));
}

export async function createExercise(name: string, muscleGroup?: string): Promise<number> {
  return getOrCreateExercise(name, muscleGroup);
}

export async function renameExercise(id: number, name: string): Promise<void> {
  await db.update(exercises).set({ name: name.trim() }).where(eq(exercises.id, id));
}

export async function setExerciseMuscleGroup(
  id: number,
  muscleGroup: string | null,
): Promise<void> {
  await db.update(exercises).set({ muscleGroup }).where(eq(exercises.id, id));
}

export async function deleteExerciseIfUnused(id: number): Promise<boolean> {
  const slots = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.exerciseId, id));
  if (slots.length > 0) return false;
  await db.delete(exercises).where(eq(exercises.id, id));
  return true;
}
