import { addWorkoutExercise, createWorkout, createWorkoutDay } from '@/domain/workouts/workouts';

export type ExerciseTemplate = {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSec: number;
};

export type DayTemplate = {
  name: string;
  weekday: number | null;
  exercises: ExerciseTemplate[];
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  description: string;
  days: DayTemplate[];
};

const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'fullbody-3',
    name: '3-Day Full Body',
    description: 'Train everything three times a week with a balanced mix of compounds.',
    days: [
      {
        name: 'Full Body A',
        weekday: MON,
        exercises: [
          { name: 'Back Squat', muscleGroup: 'Quads', sets: 3, reps: '6-10', restSec: 180 },
          { name: 'Barbell Bench Press', muscleGroup: 'Chest', sets: 3, reps: '6-10', restSec: 180 },
          { name: 'Bent-Over Barbell Row', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: 2, reps: '8-12', restSec: 150 },
          { name: 'Plank', muscleGroup: 'Core', sets: 3, reps: '45-60s', restSec: 60 },
        ],
      },
      {
        name: 'Full Body B',
        weekday: WED,
        exercises: [
          { name: 'Barbell Deadlift', muscleGroup: 'Hamstrings', sets: 3, reps: '5-8', restSec: 180 },
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Leg Press', muscleGroup: 'Quads', sets: 3, reps: '10-15', restSec: 120 },
          { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 3, reps: '12-20', restSec: 60 },
          { name: 'Hanging Leg Raise', muscleGroup: 'Core', sets: 3, reps: '10-15', restSec: 60 },
        ],
      },
      {
        name: 'Full Body C',
        weekday: FRI,
        exercises: [
          { name: 'Front Squat', muscleGroup: 'Quads', sets: 3, reps: '6-10', restSec: 180 },
          { name: 'Pull-Up', muscleGroup: 'Back', sets: 3, reps: '5-10', restSec: 150 },
          { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Hip Thrust', muscleGroup: 'Glutes', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Seated Cable Row', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 120 },
          { name: "Farmer's Carry", muscleGroup: 'Core', sets: 3, reps: '40m', restSec: 90 },
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: '4-Day Upper / Lower',
    description: 'Two upper and two lower sessions spread across the week.',
    days: [
      {
        name: 'Upper A',
        weekday: MON,
        exercises: [
          { name: 'Barbell Bench Press', muscleGroup: 'Chest', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Bent-Over Barbell Row', muscleGroup: 'Back', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 3, reps: '12-20', restSec: 60 },
          { name: 'Triceps Pushdown', muscleGroup: 'Triceps', sets: 3, reps: '10-15', restSec: 60 },
        ],
      },
      {
        name: 'Lower A',
        weekday: TUE,
        exercises: [
          { name: 'Back Squat', muscleGroup: 'Quads', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Leg Press', muscleGroup: 'Quads', sets: 3, reps: '10-15', restSec: 120 },
          { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', sets: 3, reps: '10-15', restSec: 90 },
          { name: 'Standing Calf Raise', muscleGroup: 'Calves', sets: 4, reps: '10-15', restSec: 60 },
        ],
      },
      {
        name: 'Upper B',
        weekday: THU,
        exercises: [
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: 4, reps: '8-12', restSec: 150 },
          { name: 'Pull-Up', muscleGroup: 'Back', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Seated Cable Row', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Arnold Press', muscleGroup: 'Shoulders', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: 3, reps: '10-15', restSec: 60 },
          { name: 'Face Pull', muscleGroup: 'Shoulders', sets: 3, reps: '15-20', restSec: 60 },
        ],
      },
      {
        name: 'Lower B',
        weekday: FRI,
        exercises: [
          { name: 'Barbell Deadlift', muscleGroup: 'Hamstrings', sets: 4, reps: '5-8', restSec: 180 },
          { name: 'Front Squat', muscleGroup: 'Quads', sets: 3, reps: '6-10', restSec: 180 },
          { name: 'Walking Lunge', muscleGroup: 'Quads', sets: 3, reps: '10-12/leg', restSec: 120 },
          { name: 'Leg Extension', muscleGroup: 'Quads', sets: 3, reps: '12-15', restSec: 90 },
          { name: 'Hip Thrust', muscleGroup: 'Glutes', sets: 3, reps: '8-12', restSec: 120 },
        ],
      },
    ],
  },
  {
    id: 'pplul-5',
    name: '5-Day Push / Pull / Legs / Upper / Lower',
    description: 'Push, Pull and Legs plus a dedicated Upper and Lower day — the classic PPL/UL split.',
    days: [
      {
        name: 'Push',
        weekday: MON,
        exercises: [
          { name: 'Barbell Bench Press', muscleGroup: 'Chest', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Overhead Press', muscleGroup: 'Shoulders', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Cable Crossover', muscleGroup: 'Chest', sets: 3, reps: '12-15', restSec: 60 },
          { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 4, reps: '12-20', restSec: 60 },
          { name: 'Triceps Pushdown', muscleGroup: 'Triceps', sets: 3, reps: '10-15', restSec: 60 },
        ],
      },
      {
        name: 'Pull',
        weekday: TUE,
        exercises: [
          { name: 'Barbell Deadlift', muscleGroup: 'Hamstrings', sets: 4, reps: '5-8', restSec: 180 },
          { name: 'Pull-Up', muscleGroup: 'Back', sets: 4, reps: '6-10', restSec: 150 },
          { name: 'Bent-Over Barbell Row', muscleGroup: 'Back', sets: 4, reps: '8-12', restSec: 150 },
          { name: 'Face Pull', muscleGroup: 'Shoulders', sets: 3, reps: '15-20', restSec: 60 },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: 3, reps: '10-12', restSec: 60 },
          { name: 'Hammer Curl', muscleGroup: 'Biceps', sets: 3, reps: '10-12', restSec: 60 },
        ],
      },
      {
        name: 'Legs',
        weekday: WED,
        exercises: [
          { name: 'Back Squat', muscleGroup: 'Quads', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', sets: 3, reps: '8-12', restSec: 150 },
          { name: 'Leg Press', muscleGroup: 'Quads', sets: 3, reps: '10-15', restSec: 120 },
          { name: 'Walking Lunge', muscleGroup: 'Quads', sets: 3, reps: '10-12/leg', restSec: 120 },
          { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', sets: 3, reps: '10-15', restSec: 90 },
          { name: 'Standing Calf Raise', muscleGroup: 'Calves', sets: 4, reps: '10-15', restSec: 60 },
        ],
      },
      {
        name: 'Upper',
        weekday: THU,
        exercises: [
          { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', sets: 4, reps: '6-10', restSec: 180 },
          { name: 'Lat Pulldown', muscleGroup: 'Back', sets: 4, reps: '8-12', restSec: 120 },
          { name: 'Chest-Supported Row', muscleGroup: 'Back', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: 3, reps: '12-20', restSec: 60 },
          { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: 3, reps: '10-15', restSec: 60 },
          { name: 'Overhead Triceps Extension', muscleGroup: 'Triceps', sets: 3, reps: '10-12', restSec: 60 },
        ],
      },
      {
        name: 'Lower',
        weekday: FRI,
        exercises: [
          { name: 'Sumo Deadlift', muscleGroup: 'Hamstrings', sets: 4, reps: '5-8', restSec: 180 },
          { name: 'Front Squat', muscleGroup: 'Quads', sets: 3, reps: '6-10', restSec: 180 },
          { name: 'Hip Thrust', muscleGroup: 'Glutes', sets: 3, reps: '8-12', restSec: 120 },
          { name: 'Leg Extension', muscleGroup: 'Quads', sets: 3, reps: '12-15', restSec: 90 },
          { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings', sets: 3, reps: '10-15', restSec: 90 },
          { name: 'Standing Calf Raise', muscleGroup: 'Calves', sets: 4, reps: '10-15', restSec: 60 },
        ],
      },
    ],
  },
];

export async function applyWorkoutTemplate(template: WorkoutTemplate): Promise<number> {
  const workout = await createWorkout(template.name);
  for (const day of template.days) {
    const dayId = await createWorkoutDay(workout.id, day.name, day.weekday);
    for (const exercise of day.exercises) {
      await addWorkoutExercise(dayId, {
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        sets: exercise.sets,
        reps: exercise.reps,
        restSec: exercise.restSec,
      });
    }
  }
  return workout.id;
}
