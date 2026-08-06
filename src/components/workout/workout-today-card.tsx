import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { getTodayWorkout, type TodaySlot } from '@/domain/workouts/schedule';
import { summarizeDay } from '@/domain/workouts/workouts';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

export function WorkoutTodayCard() {
  const theme = useTheme();
  const [today, setToday] = useState<TodaySlot | null>(null);

  useLiveTables(
    ['workouts', 'workout_days', 'workout_exercises', 'exercises', 'exercise_logs'],
    async () => setToday(await getTodayWorkout()),
    [],
  );

  if (!today) return null;

  const summary = summarizeDay(today.day);
  const meta = [
    `${summary.exerciseCount} exercise${summary.exerciseCount === 1 ? '' : 's'}`,
    `~${Math.max(1, Math.round(summary.estimatedMinutes))} min`,
  ].join(' · ');

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="barbell-outline" size={18} color={theme.accent} />
        </View>
        <View style={styles.text}>
          <ThemedText type="small" themeColor="textSecondary">
            Workout · {today.workout.name}
          </ThemedText>
          <ThemedText type="smallBold" style={styles.dayName}>
            {today.day.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {meta}
          </ThemedText>
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/workout/run',
              params: { dayId: String(today.day.id) },
            })
          }
          hitSlop={8}
          style={[styles.start, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="play" size={18} color={theme.accent} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  dayName: {
    fontSize: 16,
  },
  start: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
