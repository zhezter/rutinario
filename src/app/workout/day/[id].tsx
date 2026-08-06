import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { ConfirmSheet } from '@/components/ui/prompt';
import {
  WorkoutExerciseFormSheet,
} from '@/components/forms/workout-exercise-form';
import { Spacing } from '@/constants/theme';
import {
  addWorkoutExercise,
  deleteWorkoutExercise,
  getWorkoutDay,
  moveWorkoutExercise,
  summarizeDay,
  updateWorkoutExercise,
} from '@/domain/workouts/workouts';
import { weekdayLabel } from '@/domain/workouts/schedule';
import type { WorkoutDaySummary, WorkoutExerciseInput } from '@/domain/workouts/types';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

export default function WorkoutDayScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const dayId = Number(params.id);
  const theme = useTheme();
  const [day, setDay] = useState<WorkoutDaySummary | null>(null);
  const [exerciseForm, setExerciseForm] = useState<{
    mode: 'new' | 'edit';
    slotId?: number;
    initial?: Partial<WorkoutExerciseInput> & { exerciseName?: string };
  } | null>(null);
  const [menuTarget, setMenuTarget] = useState<{ id: number; name: string } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useLiveTables(
    ['workout_days', 'workout_exercises', 'exercises', 'exercise_logs'],
    async () => setDay(await getWorkoutDay(dayId)),
    [dayId],
  );

  const handleSubmit = async (input: WorkoutExerciseInput) => {
    if (exerciseForm?.mode === 'edit' && exerciseForm.slotId) {
      await updateWorkoutExercise(exerciseForm.slotId, input);
      return;
    }
    await addWorkoutExercise(dayId, input);
  };

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Edit',
          icon: 'pencil-outline',
          onPress: () => {
            const slot = day?.exercises.find((candidate) => candidate.id === menuTarget.id);
            if (!slot) return;
            setExerciseForm({
              mode: 'edit',
              slotId: slot.id,
              initial: {
                exerciseName: slot.exercise.name,
                muscleGroup: slot.exercise.muscleGroup ?? '',
                sets: slot.sets,
                reps: slot.reps,
                restSec: slot.restSec ?? undefined,
                weightKg: slot.weightKg ?? undefined,
                notes: slot.notes ?? '',
              },
            });
          },
        },
        {
          label: 'Move up',
          icon: 'arrow-up-outline',
          onPress: () => void moveWorkoutExercise(menuTarget.id, 'up'),
        },
        {
          label: 'Move down',
          icon: 'arrow-down-outline',
          onPress: () => void moveWorkoutExercise(menuTarget.id, 'down'),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete exercise?',
              message: `This removes "${menuTarget.name}" from this day and its logs.`,
              onConfirm: async () => {
                await deleteWorkoutExercise(menuTarget.id);
              },
            }),
        },
      ]
    : [];

  const summary = day ? summarizeDay(day) : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              {day?.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {summary
                ? [
                    weekdayLabel(day?.weekday ?? null) ?? 'Any day',
                    `${summary.setCount} sets · ~${Math.max(1, Math.round(summary.estimatedMinutes))} min`,
                  ].join(' · ')
                : ''}
            </ThemedText>
          </View>
        </View>

        {day?.exercises.map((slot) => {
          const meta = [
            `${slot.sets} × ${slot.reps}`,
            slot.restSec != null ? `${slot.restSec}s rest` : null,
            slot.weightKg != null ? `${slot.weightKg} kg` : null,
          ]
            .filter((part): part is string => part !== null)
            .join(' · ');
          return (
            <Pressable
              key={slot.id}
              onPress={() =>
                setExerciseForm({
                  mode: 'edit',
                  slotId: slot.id,
                  initial: {
                    exerciseName: slot.exercise.name,
                    muscleGroup: slot.exercise.muscleGroup ?? '',
                    sets: slot.sets,
                    reps: slot.reps,
                    restSec: slot.restSec ?? undefined,
                    weightKg: slot.weightKg ?? undefined,
                    notes: slot.notes ?? '',
                  },
                })
              }
              onLongPress={() =>
                setMenuTarget({ id: slot.id, name: slot.exercise.name })
              }
              delayLongPress={300}>
              {({ pressed }) => (
                <Card style={[styles.exerciseCard, pressed && { opacity: 0.6 }]}>
                  <View style={styles.exerciseRow}>
                    <View style={styles.exerciseText}>
                      <ThemedText type="smallBold">{slot.exercise.name}</ThemedText>
                      {slot.exercise.muscleGroup ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {slot.exercise.muscleGroup}
                        </ThemedText>
                      ) : null}
                      <ThemedText type="small" themeColor="textSecondary">
                        {meta}
                      </ThemedText>
                      {slot.notes ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {slot.notes}
                        </ThemedText>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </View>
                </Card>
              )}
            </Pressable>
          );
        })}

        {day && day.exercises.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText type="smallBold">No exercises yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tap “Add exercise” to build this session. The player guides you set by set.
            </ThemedText>
          </Card>
        ) : null}

        <Pressable
          onPress={() => setExerciseForm({ mode: 'new' })}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="add" size={20} color={theme.accent} />
          <ThemedText type="smallBold">Add exercise</ThemedText>
        </Pressable>
      </ScrollView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      {exerciseForm ? (
        <WorkoutExerciseFormSheet
          visible
          title={exerciseForm.mode === 'edit' ? 'Edit exercise' : 'Add exercise'}
          initial={exerciseForm.initial}
          submitLabel={exerciseForm.mode === 'edit' ? 'Save' : 'Add exercise'}
          onSubmit={(input) => {
            setExerciseForm(null);
            void handleSubmit(input);
          }}
          onClose={() => setExerciseForm(null)}
        />
      ) : null}

      {confirm ? (
        <ConfirmSheet
          visible
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Delete"
          onConfirm={() => {
            setConfirm(null);
            void confirm.onConfirm();
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  headerButton: {
    padding: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  exerciseCard: {
    padding: Spacing.three,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseText: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
