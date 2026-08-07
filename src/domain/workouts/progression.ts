import { asc, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { exerciseLogs, exercises, workoutExercises } from '@/db/schema';

export type ProgressionSession = {
  date: string;
  sets: number;
  totalReps: number;
  volumeKg: number;
  bestWeightKg: number | null;
  e1rmKg: number | null;
};

export type ExerciseProgression = {
  exerciseId: number;
  name: string;
  muscleGroup: string | null;
  sessions: ProgressionSession[];
  totalSessions: number;
  bestWeightKg: number | null;
  best1rmKg: number | null;
  current1rmKg: number | null;
  first1rmKg: number | null;
  totalVolumeKg: number;
  lastDate: string | null;
};

export function estimate1rm(weightKg: number | null, reps: number): number | null {
  if (weightKg == null || reps <= 0) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export async function getExerciseProgression(
  exerciseId: number,
): Promise<ExerciseProgression> {
  const exercise = await db.query.exercises.findFirst({
    where: eq(exercises.id, exerciseId),
  });

  const empty = (): ExerciseProgression => ({
    exerciseId,
    name: exercise?.name ?? 'Unknown exercise',
    muscleGroup: exercise?.muscleGroup ?? null,
    sessions: [],
    totalSessions: 0,
    bestWeightKg: null,
    best1rmKg: null,
    current1rmKg: null,
    first1rmKg: null,
    totalVolumeKg: 0,
    lastDate: null,
  });

  if (!exercise) return empty();

  const rows = await db
    .select({
      date: exerciseLogs.date,
      weightKg: exerciseLogs.weightKg,
      reps: exerciseLogs.reps,
    })
    .from(exerciseLogs)
    .innerJoin(workoutExercises, eq(exerciseLogs.workoutExerciseId, workoutExercises.id))
    .where(eq(workoutExercises.exerciseId, exerciseId))
    .orderBy(asc(exerciseLogs.date), asc(exerciseLogs.setIndex));

  const byDate = new Map<
    string,
    {
      sets: number;
      totalReps: number;
      volumeKg: number;
      bestWeightKg: number | null;
      best1rmKg: number | null;
    }
  >();

  for (const row of rows) {
    const acc = byDate.get(row.date) ?? {
      sets: 0,
      totalReps: 0,
      volumeKg: 0,
      bestWeightKg: null as number | null,
      best1rmKg: null as number | null,
    };
    acc.sets += 1;
    acc.totalReps += row.reps;
    if (row.weightKg != null) {
      acc.volumeKg += row.weightKg * row.reps;
      acc.bestWeightKg =
        acc.bestWeightKg == null
          ? row.weightKg
          : Math.max(acc.bestWeightKg, row.weightKg);
      const e1rm = estimate1rm(row.weightKg, row.reps);
      if (e1rm != null) {
        acc.best1rmKg = acc.best1rmKg == null ? e1rm : Math.max(acc.best1rmKg, e1rm);
      }
    }
    byDate.set(row.date, acc);
  }

  const sessions: ProgressionSession[] = [...byDate.keys()].sort().map((date) => {
    const acc = byDate.get(date)!;
    return {
      date,
      sets: acc.sets,
      totalReps: acc.totalReps,
      volumeKg: Math.round(acc.volumeKg * 10) / 10,
      bestWeightKg: acc.bestWeightKg,
      e1rmKg: acc.best1rmKg,
    };
  });

  const e1rmValues = sessions
    .map((session) => session.e1rmKg)
    .filter((value): value is number => value != null);

  return {
    exerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    sessions,
    totalSessions: sessions.length,
    bestWeightKg: sessions.reduce<number | null>(
      (best, session) =>
        session.bestWeightKg != null
          ? best == null
            ? session.bestWeightKg
            : Math.max(best, session.bestWeightKg)
          : best,
      null,
    ),
    best1rmKg: e1rmValues.length > 0 ? Math.max(...e1rmValues) : null,
    current1rmKg: e1rmValues.length > 0 ? e1rmValues[e1rmValues.length - 1] : null,
    first1rmKg: e1rmValues.length > 0 ? e1rmValues[0] : null,
    totalVolumeKg: Math.round(sessions.reduce((sum, session) => sum + session.volumeKg, 0)),
    lastDate: sessions.length > 0 ? sessions[sessions.length - 1].date : null,
  };
}
