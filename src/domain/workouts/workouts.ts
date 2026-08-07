import { and, asc, desc, eq, gt, like, lt } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  exercises,
  workoutDays,
  workoutExercises,
  workouts,
} from '@/db/schema';
import type {
  WorkoutDaySummary,
  WorkoutExerciseInput,
  WorkoutExerciseSummary,
  WorkoutSummary,
} from '@/domain/workouts/types';

export async function listWorkouts(): Promise<WorkoutSummary[]> {
  const rows = await db.query.workouts.findMany({
    with: {
      days: {
        orderBy: (days, { asc: ascFn }) => [ascFn(days.position)],
        with: {
          exercises: {
            orderBy: (slots, { asc: ascFn }) => [ascFn(slots.orderIndex)],
            with: { exercise: true },
          },
        },
      },
    },
    orderBy: (rows, { asc: ascFn }) => [ascFn(rows.sortOrder)],
  });
  return rows.map((workout) => ({
    ...workout,
    days: workout.days.map((day) => ({ ...day, cycleWeeks: workout.cycleWeeks })),
  }));
}

export async function getWorkout(id: number): Promise<WorkoutSummary | null> {
  const rows = await listWorkouts();
  return rows.find((workout) => workout.id === id) ?? null;
}

export async function getWorkoutDay(id: number): Promise<WorkoutDaySummary | null> {
  const day = await db.query.workoutDays.findFirst({
    where: (rows, { eq: eqFn }) => eqFn(rows.id, id),
    with: {
      workout: true,
      exercises: {
        orderBy: (slots, { asc: ascFn }) => [ascFn(slots.orderIndex)],
        with: { exercise: true },
      },
    },
  });
  if (!day) return null;
  const { workout, ...rest } = day;
  return { ...rest, cycleWeeks: workout.cycleWeeks };
}

export async function createWorkout(name: string): Promise<WorkoutSummary> {
  const count = await db.select().from(workouts);
  const [row] = await db
    .insert(workouts)
    .values({ name: name.trim(), sortOrder: count.length })
    .returning();
  const created = await getWorkout(row.id);
  if (!created) throw new Error('Workout could not be created.');
  return created;
}

export async function updateWorkoutCycle(workoutId: number, cycleWeeks: number | null): Promise<void> {
  await db
    .update(workouts)
    .set({
      cycleWeeks: cycleWeeks != null ? Math.max(1, Math.round(cycleWeeks)) : null,
      mode: cycleWeeks != null ? 'cycle' : 'weekday',
    })
    .where(eq(workouts.id, workoutId));
}

export async function renameWorkout(id: number, name: string): Promise<void> {
  await db.update(workouts).set({ name: name.trim() }).where(eq(workouts.id, id));
}

export async function setActiveWorkout(id: number): Promise<void> {
  await db
    .update(workouts)
    .set({ isActive: 0 })
    .where(gt(workouts.id, 0));
  await db.update(workouts).set({ isActive: 1 }).where(eq(workouts.id, id));
}

export async function clearActiveWorkout(): Promise<void> {
  await db.update(workouts).set({ isActive: 0 }).where(gt(workouts.id, 0));
}

export async function deleteWorkout(id: number): Promise<void> {
  await db.delete(workouts).where(eq(workouts.id, id));
}

export async function createWorkoutDay(
  workoutId: number,
  name: string,
  weekday: number | null,
): Promise<number> {
  const parent = await getWorkout(workoutId);
  const position = parent?.days.length ?? 0;
  const [row] = await db
    .insert(workoutDays)
    .values({ workoutId, name: name.trim(), weekday, position })
    .returning();
  return row.id;
}

export async function renameWorkoutDay(id: number, name: string): Promise<void> {
  await db.update(workoutDays).set({ name: name.trim() }).where(eq(workoutDays.id, id));
}

export async function setWorkoutDayWeekday(id: number, weekday: number | null): Promise<void> {
  await db.update(workoutDays).set({ weekday }).where(eq(workoutDays.id, id));
}

export async function updateWorkoutDay(
  id: number,
  name: string,
  weekday: number | null,
): Promise<void> {
  await db
    .update(workoutDays)
    .set({ name: name.trim(), weekday })
    .where(eq(workoutDays.id, id));
}

export async function deleteWorkoutDay(id: number): Promise<void> {
  await db.delete(workoutDays).where(eq(workoutDays.id, id));
}

export async function moveWorkoutDay(id: number, direction: 'up' | 'down'): Promise<void> {
  const day = await db.query.workoutDays.findFirst({
    where: (rows, { eq: eqFn }) => eqFn(rows.id, id),
  });
  if (!day) return;
  const sibling =
    direction === 'up'
      ? await db
          .select()
          .from(workoutDays)
          .where(
            and(
              eq(workoutDays.workoutId, day.workoutId),
              lt(workoutDays.position, day.position),
            ),
          )
          .orderBy(desc(workoutDays.position))
          .limit(1)
      : await db
          .select()
          .from(workoutDays)
          .where(
            and(
              eq(workoutDays.workoutId, day.workoutId),
              gt(workoutDays.position, day.position),
            ),
          )
          .orderBy(asc(workoutDays.position))
          .limit(1);
  if (sibling.length === 0) return;

  await db
    .update(workoutDays)
    .set({ position: sibling[0].position })
    .where(eq(workoutDays.id, day.id));
  await db
    .update(workoutDays)
    .set({ position: day.position })
    .where(eq(workoutDays.id, sibling[0].id));
}

export async function getOrCreateExercise(
  name: string,
  muscleGroup?: string,
): Promise<number> {
  const trimmed = name.trim();
  const existing = await db
    .select()
    .from(exercises)
    .where(like(exercises.name, trimmed))
    .limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db
    .insert(exercises)
    .values({ name: trimmed, muscleGroup: muscleGroup?.trim() || null })
    .returning();
  return row.id;
}

export async function addWorkoutExercise(
  workoutDayId: number,
  input: WorkoutExerciseInput,
): Promise<number> {
  const day = await getWorkoutDay(workoutDayId);
  const exerciseId = await getOrCreateExercise(input.exerciseName, input.muscleGroup);
  const [row] = await db
    .insert(workoutExercises)
    .values({
      workoutDayId,
      exerciseId,
      sets: input.sets,
      reps: input.reps,
      restSec: input.restSec ?? null,
      weightKg: input.weightKg ?? null,
      incrementKg: input.incrementKg ?? null,
      notes: input.notes?.trim() || null,
      orderIndex: day?.exercises.length ?? 0,
    })
    .returning();
  return row.id;
}

export async function updateWorkoutExercise(
  id: number,
  input: Partial<WorkoutExerciseInput>,
): Promise<void> {
  const slot = await db.query.workoutExercises.findFirst({
    where: (rows, { eq: eqFn }) => eqFn(rows.id, id),
  });
  if (!slot) return;

  if (input.exerciseName?.trim()) {
    await db
      .update(exercises)
      .set({
        name: input.exerciseName.trim(),
        muscleGroup: input.muscleGroup?.trim() || null,
      })
      .where(eq(exercises.id, slot.exerciseId));
  }

  await db
    .update(workoutExercises)
    .set({
      sets: input.sets,
      reps: input.reps,
      restSec: input.restSec ?? null,
      weightKg: input.weightKg ?? null,
      incrementKg: input.incrementKg ?? null,
      notes: input.notes?.trim() || null,
    })
    .where(eq(workoutExercises.id, id));
}

export async function deleteWorkoutExercise(id: number): Promise<void> {
  await db.delete(workoutExercises).where(eq(workoutExercises.id, id));
}

export async function moveWorkoutExercise(
  id: number,
  direction: 'up' | 'down',
): Promise<void> {
  const slot = await db.query.workoutExercises.findFirst({
    where: (rows, { eq: eqFn }) => eqFn(rows.id, id),
  });
  if (!slot) return;
  const sibling =
    direction === 'up'
      ? await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.workoutDayId, slot.workoutDayId),
              lt(workoutExercises.orderIndex, slot.orderIndex),
            ),
          )
          .orderBy(desc(workoutExercises.orderIndex))
          .limit(1)
      : await db
          .select()
          .from(workoutExercises)
          .where(
            and(
              eq(workoutExercises.workoutDayId, slot.workoutDayId),
              gt(workoutExercises.orderIndex, slot.orderIndex),
            ),
          )
          .orderBy(asc(workoutExercises.orderIndex))
          .limit(1);
  if (sibling.length === 0) return;

  await db
    .update(workoutExercises)
    .set({ orderIndex: sibling[0].orderIndex })
    .where(eq(workoutExercises.id, slot.id));
  await db
    .update(workoutExercises)
    .set({ orderIndex: slot.orderIndex })
    .where(eq(workoutExercises.id, sibling[0].id));
}

export function summarizeDay(day: Pick<WorkoutDaySummary, 'exercises' | 'restSec'>): {
  exerciseCount: number;
  setCount: number;
  estimatedMinutes: number;
} {
  const exerciseCount = day.exercises.length;
  const setCount = day.exercises.reduce((acc, slot) => acc + slot.sets, 0);
  const estimatedMinutes = day.exercises.reduce((acc, slot) => {
    const rest = slot.restSec ?? day.restSec ?? 90;
    return acc + slot.sets * (rest / 60 + 0.75);
  }, 0);
  return { exerciseCount, setCount, estimatedMinutes };
}

export type { WorkoutExerciseSummary };
