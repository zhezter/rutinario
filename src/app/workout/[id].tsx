import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { ConfirmSheet, PromptSheet } from '@/components/ui/prompt';
import {
  WorkoutDayFormSheet,
  type WorkoutDayFormResult,
} from '@/components/forms/workout-day-form';
import { Spacing } from '@/constants/theme';
import {
  createWorkoutDay,
  deleteWorkoutDay,
  getWorkout,
  moveWorkoutDay,
  renameWorkout,
  renameWorkoutDay,
  summarizeDay,
  updateWorkoutDay,
} from '@/domain/workouts/workouts';
import { weekdayLabel } from '@/domain/workouts/schedule';
import type { WorkoutSummary } from '@/domain/workouts/types';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

export default function WorkoutDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(params.id);
  const theme = useTheme();
  const [workout, setWorkout] = useState<WorkoutSummary | null>(null);
  const [menuTarget, setMenuTarget] = useState<{ id: number; name: string } | null>(null);
  const [dayForm, setDayForm] = useState<{
    mode: 'new' | 'edit';
    dayId?: number;
    initial?: { name: string; weekday: number | null };
  } | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    submitLabel: string;
    initialValue?: string;
    onSubmit: (value: string) => void;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useLiveTables(
    ['workouts', 'workout_days', 'workout_exercises', 'exercises'],
    async () => setWorkout(await getWorkout(workoutId)),
    [workoutId],
  );

  const handleDaySubmit = async (result: WorkoutDayFormResult) => {
    if (dayForm?.mode === 'edit' && dayForm.dayId) {
      await updateWorkoutDay(dayForm.dayId, result.name, result.weekday);
      return;
    }
    await createWorkoutDay(workoutId, result.name, result.weekday);
  };

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename day',
              initialValue: menuTarget.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await renameWorkoutDay(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Edit weekday',
          icon: 'calendar-outline',
          onPress: () => {
            const day = workout?.days.find((candidate) => candidate.id === menuTarget.id);
            setDayForm({
              mode: 'edit',
              dayId: day?.id,
              initial: { name: day?.name ?? '', weekday: day?.weekday ?? null },
            });
          },
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete day?',
              message: `This deletes "${menuTarget.name}" and its exercises.`,
              onConfirm: async () => {
                await deleteWorkoutDay(menuTarget.id);
              },
            }),
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              {workout?.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {workout?.days.length ?? 0} day{workout?.days.length === 1 ? '' : 's'} ·
              pin each day to the weekday it happens
            </ThemedText>
          </View>
          <Pressable
            onPress={() =>
              workout &&
              setPrompt({
                title: 'Rename workout',
                initialValue: workout.name,
                submitLabel: 'Rename',
                onSubmit: async (name) => {
                  await renameWorkout(workoutId, name);
                },
              })
            }
            hitSlop={8}
            style={styles.headerButton}>
            <Ionicons name="pencil-outline" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        {workout?.days.map((day, index) => {
          const summary = summarizeDay(day);
          const meta = [
            weekdayLabel(day.weekday) ?? 'Any day',
            `${summary.exerciseCount} exercise${summary.exerciseCount === 1 ? '' : 's'}`,
          ].join(' · ');
          return (
            <Pressable
              key={day.id}
              onPress={() =>
                router.push({
                  pathname: '/workout/day/[id]',
                  params: { id: String(day.id) },
                })
              }
              onLongPress={() => setMenuTarget({ id: day.id, name: day.name })}
              delayLongPress={300}>
              {({ pressed }) => (
                <Card style={[styles.dayCard, pressed && { opacity: 0.6 }]}>
                  <View style={styles.dayRow}>
                    <View style={styles.dayText}>
                      <ThemedText type="smallBold">{day.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {meta}
                      </ThemedText>
                    </View>
                    <View style={styles.dayActions}>
                      {day.exercises.length === 0 ? null : (
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/workout/run',
                              params: { dayId: String(day.id) },
                            })
                          }
                          hitSlop={8}
                          style={styles.playButton}>
                          <Ionicons name="play" size={18} color={theme.accent} />
                        </Pressable>
                      )}
                      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                    </View>
                  </View>
                  {index < (workout?.days.length ?? 0) - 1 ? (
                    <View style={styles.reorderRow}>
                      <Pressable
                        onPress={() => void moveWorkoutDay(day.id, 'up')}
                        disabled={index === 0}
                        hitSlop={8}>
                        <Ionicons
                          name="arrow-up-circle-outline"
                          size={20}
                          color={index === 0 ? theme.textSecondary : theme.text}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => void moveWorkoutDay(day.id, 'down')}
                        disabled={index === (workout?.days.length ?? 0) - 1}
                        hitSlop={8}>
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={20}
                          color={
                            index === (workout?.days.length ?? 0) - 1
                              ? theme.textSecondary
                              : theme.text
                          }
                        />
                      </Pressable>
                    </View>
                  ) : null}
                </Card>
              )}
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => setDayForm({ mode: 'new' })}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="add" size={20} color={theme.accent} />
          <ThemedText type="smallBold">Add day</ThemedText>
        </Pressable>
      </ScrollView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      {dayForm ? (
        <WorkoutDayFormSheet
          visible
          title={dayForm.mode === 'edit' ? 'Edit day' : 'Add day'}
          initial={dayForm.initial}
          submitLabel={dayForm.mode === 'edit' ? 'Save' : 'Add day'}
          onSubmit={(result) => {
            setDayForm(null);
            void handleDaySubmit(result);
          }}
          onClose={() => setDayForm(null)}
        />
      ) : null}

      {prompt ? (
        <PromptSheet
          visible
          title={prompt.title}
          initialValue={prompt.initialValue}
          submitLabel={prompt.submitLabel}
          onSubmit={async (value) => {
            setPrompt(null);
            await prompt.onSubmit(value);
          }}
          onClose={() => setPrompt(null)}
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
  dayCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayText: {
    flex: 1,
    gap: Spacing.half,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  playButton: {
    padding: Spacing.one,
  },
  reorderRow: {
    flexDirection: 'row',
    gap: Spacing.three,
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
