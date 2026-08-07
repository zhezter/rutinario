import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import {
  WorkoutDayFormSheet,
  type WorkoutDayFormResult,
} from '@/components/forms/workout-day-form';
import { Spacing } from '@/constants/theme';
import {
  listWorkouts,
  summarizeDay,
  updateWorkoutDay,
} from '@/domain/workouts/workouts';
import { weekdayFromDate, weekdayLabelShort } from '@/domain/workouts/schedule';
import type { WorkoutDaySummary, WorkoutSummary } from '@/domain/workouts/types';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function WeekScreen() {
  const theme = useTheme();
  const [workouts, setWorkouts] = useState<WorkoutSummary[] | null>(null);
  const [menuTarget, setMenuTarget] = useState<WorkoutDaySummary | null>(null);
  const [dayForm, setDayForm] = useState<{
    dayId: number;
    initial: { name: string; weekday: number | null };
  } | null>(null);

  useLiveTables(
    ['workouts', 'workout_days', 'workout_exercises', 'exercises'],
    async () => setWorkouts(await listWorkouts()),
    [],
  );

  const activeWorkout = workouts?.find((workout) => workout.isActive === 1) ?? workouts?.[0] ?? null;
  const today = weekdayFromDate(new Date());

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Open day',
          icon: 'list-outline',
          onPress: () =>
            router.push({
              pathname: '/workout/day/[id]',
              params: { id: String(menuTarget.id) },
            }),
        },
        {
          label: 'Move to another weekday',
          icon: 'calendar-outline',
          onPress: () =>
            setDayForm({
              dayId: menuTarget.id,
              initial: { name: menuTarget.name, weekday: menuTarget.weekday },
            }),
        },
      ]
    : [];

  const handleDaySubmit = async (result: WorkoutDayFormResult) => {
    if (!dayForm) return;
    await updateWorkoutDay(dayForm.dayId, result.name, result.weekday);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              This week
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {activeWorkout
                ? `${activeWorkout.name} · ${activeWorkout.days.length} days`
                : 'No split selected'}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {WEEK.map((weekday) => {
            const day = activeWorkout?.days.find((candidate) => candidate.weekday === weekday);
            const isToday = weekday === today;
            const summary = day ? summarizeDay(day) : null;
            return (
              <Pressable
                key={weekday}
                onPress={() => {
                  if (!day) return;
                  router.push({
                    pathname: '/workout/run',
                    params: { dayId: String(day.id) },
                  });
                }}
                onLongPress={() => {
                  if (day) setMenuTarget(day);
                }}
                delayLongPress={300}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
                <Card
                  style={[
                    styles.dayCard,
                    isToday && { borderColor: theme.accent },
                    day == null && { opacity: 0.55 },
                  ]}>
                  <View style={styles.dayRow}>
                    <View style={styles.weekdayCol}>
                      <ThemedText
                        type="smallBold"
                        style={isToday ? { color: theme.accent } : undefined}>
                        {weekdayLabelShort(weekday) ?? ''}
                      </ThemedText>
                      {isToday ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          Today
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.dayText}>
                      <ThemedText type="smallBold">
                        {day ? day.name : 'Rest'}
                      </ThemedText>
                      {day && summary ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {summary.exerciseCount} exercise
                          {summary.exerciseCount === 1 ? '' : 's'} · {summary.setCount} sets · ~
                          {Math.max(1, Math.round(summary.estimatedMinutes))} min
                        </ThemedText>
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          No session pinned here
                        </ThemedText>
                      )}
                    </View>
                    {day ? (
                      <View style={styles.dayActions}>
                        <Pressable
                          onPress={() =>
                            router.push({
                              pathname: '/workout/day/[id]',
                              params: { id: String(day.id) },
                            })
                          }
                          hitSlop={8}>
                          <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
                        </Pressable>
                        <View style={[styles.playButton, { backgroundColor: theme.accent }]}>
                          <Ionicons name="play" size={16} color={theme.background} />
                        </View>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}

          {activeWorkout ? (
            <Card style={styles.hintCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Long-press a session to move it to another weekday. Days without a pinned weekday
                show as “Rest” here but can still be run from the split.
              </ThemedText>
            </Card>
          ) : (
            <Card style={styles.hintCard}>
              <ThemedText type="small" themeColor="textSecondary">
                Pick an active split from the Workout tab to see your week here.
              </ThemedText>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      {dayForm ? (
        <WorkoutDayFormSheet
          visible
          title="Move day"
          initial={dayForm.initial}
          submitLabel="Save"
          onSubmit={(result) => {
            setDayForm(null);
            void handleDaySubmit(result);
          }}
          onClose={() => setDayForm(null)}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
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
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  dayCard: {
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  weekdayCol: {
    width: 48,
    gap: Spacing.half,
  },
  dayText: {
    flex: 1,
    gap: Spacing.half,
  },
  dayActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintCard: {
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
});
