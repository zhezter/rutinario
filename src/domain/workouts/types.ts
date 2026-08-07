import type { WorkoutMode } from '@/db/schema';

export type WorkoutExerciseSummary = {
  id: number;
  workoutDayId: number;
  exerciseId: number;
  sets: number;
  reps: string;
  restSec: number | null;
  weightKg: number | null;
  incrementKg: number | null;
  orderIndex: number;
  notes: string | null;
  exercise: {
    id: number;
    name: string;
    muscleGroup: string | null;
  };
};

export type WorkoutDaySummary = {
  id: number;
  workoutId: number;
  name: string;
  position: number;
  weekday: number | null;
  restSec: number | null;
  cycleWeeks: number | null;
  exercises: WorkoutExerciseSummary[];
};

export type WorkoutSummary = {
  id: number;
  name: string;
  mode: WorkoutMode;
  cycleWeeks: number | null;
  isActive: number;
  defaultRestSec: number;
  days: WorkoutDaySummary[];
};

export type WorkoutExerciseInput = {
  exerciseName: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  restSec?: number;
  weightKg?: number;
  incrementKg?: number;
  notes?: string;
};
