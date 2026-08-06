import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { ConfirmSheet, PromptSheet } from '@/components/ui/prompt';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  createWorkout,
  deleteWorkout,
  listWorkouts,
  renameWorkout,
  summarizeDay,
} from '@/domain/workouts/workouts';
import {
  getTodayWorkout,
  weekdayLabelShort,
  type TodaySlot,
} from '@/domain/workouts/schedule';
import type { WorkoutSummary } from '@/domain/workouts/types';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

type MenuTarget = {
  id: number;
  name: string;
};

export default function WorkoutScreen() {
  const theme = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutSummary[] | null>(null);
  const [today, setToday] = useState<TodaySlot | null>(null);
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    message?: string;
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
    ['workouts', 'workout_days', 'workout_exercises', 'exercises', 'exercise_logs'],
    async () => {
      setWorkouts(await listWorkouts());
      setToday(await getTodayWorkout());
    },
    [],
  );

  const handleNewWorkout = () =>
    setPrompt({
      title: 'New workout',
      message: 'A split that knows what is today.',
      submitLabel: 'Create',
      onSubmit: async (name) => {
        await createWorkout(name);
      },
    });

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename workout',
              initialValue: menuTarget.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await renameWorkout(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete workout?',
              message: `This deletes "${menuTarget.name}" and all its days, exercises and logs.`,
              onConfirm: async () => {
                await deleteWorkout(menuTarget.id);
              },
            }),
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>
                Workout
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Your training split, one tap away
              </ThemedText>
            </View>
            <Pressable onPress={handleNewWorkout} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="add" size={26} color={theme.accent} />
            </Pressable>
          </View>

          {today ? <TodayCard today={today} /> : null}

          {workouts !== null && workouts.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText type="smallBold">No workouts yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap + to create your first split. Add days like Push / Pull / Legs and pin them
                to the weekday they happen. Training days show up here automatically.
              </ThemedText>
            </Card>
          ) : null}

          {workouts?.map((workout) => {
            const dayChips = workout.days
              .map((day) => ({
                id: day.id,
                label: weekdayLabelShort(day.weekday) ?? day.name,
              }))
              .filter((chip) => chip.label.length > 0);
            return (
              <Pressable
                key={workout.id}
                onPress={() =>
                  router.push({
                    pathname: '/workout/[id]',
                    params: { id: String(workout.id) },
                  })
                }
                onLongPress={() => setMenuTarget({ id: workout.id, name: workout.name })}
                delayLongPress={300}>
                {({ pressed }) => (
                  <Card style={[styles.workoutCard, pressed && { opacity: 0.6 }]}>
                    <View style={styles.workoutRow}>
                      <View style={styles.workoutText}>
                        <ThemedText type="smallBold">{workout.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {workout.days.length} day{workout.days.length === 1 ? '' : 's'}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={theme.textSecondary}
                      />
                    </View>
                    {dayChips.length > 0 ? (
                      <View style={styles.dayChips}>
                        {dayChips.map((chip) => (
                          <View
                            key={chip.id}
                            style={[
                              styles.dayChip,
                              { backgroundColor: theme.backgroundSelected },
                            ]}>
                            <ThemedText type="small">{chip.label}</ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Card>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      {prompt ? (
        <PromptSheet
          visible
          title={prompt.title}
          message={prompt.message}
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

function TodayCard({ today }: { today: TodaySlot }) {
  const theme = useTheme();
  const summary = summarizeDay(today.day);
  const meta = [
    `${summary.exerciseCount} exercise${summary.exerciseCount === 1 ? '' : 's'}`,
    `~${Math.max(1, Math.round(summary.estimatedMinutes))} min`,
    `${summary.setCount} sets`,
  ].join(' · ');

  return (
    <Card style={[styles.todayCard, { borderColor: theme.accent }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.todayEyebrow}>
        {today.workout.name} · Today
      </ThemedText>
      <ThemedText type="title" style={styles.todayTitle}>
        {today.day.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {meta}
      </ThemedText>
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/workout/run',
            params: { dayId: String(today.day.id) },
          })
        }
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          Start session
        </ThemedText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  headerButton: {
    padding: Spacing.one,
  },
  todayCard: {
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
  },
  todayEyebrow: {
    textTransform: 'uppercase',
  },
  todayTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  workoutCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutText: {
    gap: Spacing.half,
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  dayChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
});
