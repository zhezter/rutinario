import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { ConfirmSheet, PromptSheet } from '@/components/ui/prompt';
import { WorkoutTemplatesSheet } from '@/components/workout/workout-templates-sheet';
import { Spacing } from '@/constants/theme';
import {
  createWorkout,
  deleteWorkout,
  listWorkouts,
  renameWorkout,
  setActiveWorkout,
  summarizeDay,
} from '@/domain/workouts/workouts';
import { getTodayWorkout, type TodaySlot } from '@/domain/workouts/schedule';
import type { WorkoutSummary } from '@/domain/workouts/types';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

type MenuTarget = {
  id: number;
  name: string;
  isActive: number;
};

export function WorkoutSection() {
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [addMenu, setAddMenu] = useState(false);

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

  const addActions: SheetAction[] = [
    {
      label: 'Start from a template',
      icon: 'albums-outline',
      onPress: () => setShowTemplates(true),
    },
    {
      label: 'Blank workout',
      icon: 'add-circle-outline',
      onPress: handleNewWorkout,
    },
  ];

  const menuActions: SheetAction[] = menuTarget
    ? [
        ...(menuTarget.isActive
          ? []
          : [
              {
                label: 'Set active this week',
                icon: 'checkmark-circle-outline' as const,
                onPress: () => {
                  void setActiveWorkout(menuTarget.id);
                },
              },
            ]),
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
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">Workout</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your training split
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/catalog')}
            hitSlop={8}
            style={styles.headerButton}>
            <Ionicons name="library-outline" size={22} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setAddMenu(true)} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
          </Pressable>
        </View>
      </View>

      {today ? <TodayCard today={today} /> : null}

      {workouts !== null && workouts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText type="small">No workouts yet — tap + to create your first split.</ThemedText>
        </Card>
      ) : null}

      {workouts?.map((workout) => {
        const dayChips = workout.days.map((day) => ({
          id: day.id,
          label: weekdayShort(day.weekday, day.name),
        }));
        return (
          <Pressable
            key={workout.id}
            onPress={() =>
              router.push({
                pathname: '/workout/[id]',
                params: { id: String(workout.id) },
              })
            }
            onLongPress={() =>
              setMenuTarget({ id: workout.id, name: workout.name, isActive: workout.isActive })
            }
            delayLongPress={300}>
            {({ pressed }) => (
              <Card style={[styles.workoutCard, pressed && { opacity: 0.6 }]}>
                <View style={styles.workoutRow}>
                  <View style={styles.workoutText}>
                    <View style={styles.workoutTitleRow}>
                      <ThemedText type="smallBold">{workout.name}</ThemedText>
                      {workout.isActive === 1 ? (
                        <View style={[styles.activeBadge, { backgroundColor: theme.accent }]}>
                          <ThemedText type="small" style={{ color: theme.background }}>
                            Active
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {workout.days.length} day{workout.days.length === 1 ? '' : 's'}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </View>
                {dayChips.length > 0 ? (
                  <View style={styles.dayChips}>
                    {dayChips.map((chip) => (
                      <View
                        key={chip.id}
                        style={[styles.dayChip, { backgroundColor: theme.backgroundSelected }]}>
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

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      <ActionSheet
        visible={addMenu}
        title="New workout"
        onClose={() => setAddMenu(false)}
        actions={addActions}
      />

      <WorkoutTemplatesSheet
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onApplied={(workoutId) => {
          setShowTemplates(false);
          router.push({
            pathname: '/workout/[id]',
            params: { id: String(workoutId) },
          });
        }}
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
    </View>
  );
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekdayShort(weekday: number | null, fallback: string): string {
  if (weekday === null || weekday < 0 || weekday > 6) return fallback;
  return WEEKDAY_SHORT[weekday];
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
      <ThemedText type="smallBold" style={styles.todayTitle}>
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
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  headerText: {
    gap: Spacing.half,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
  },
  startButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyCard: {
    padding: Spacing.three,
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
  workoutTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  activeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
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
