import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { LineChart } from '@/components/ui/line-chart';
import { Spacing } from '@/constants/theme';
import {
  getExerciseProgression,
  type ExerciseProgression,
} from '@/domain/workouts/progression';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function shortDate(date: string): string {
  return format(parseISO(date), 'MMM d');
}

function fullDate(date: string): string {
  return format(parseISO(date), 'EEE, MMM d');
}

export default function ProgressionScreen() {
  const params = useLocalSearchParams<{ exerciseId: string }>();
  const exerciseId = Number(params.exerciseId);
  const theme = useTheme();
  const [data, setData] = useState<ExerciseProgression | null>(null);

  useLiveTables(
    ['exercise_logs', 'workout_exercises', 'exercises'],
    async () => setData(await getExerciseProgression(exerciseId)),
    [exerciseId],
  );

  const sessions = data?.sessions ?? [];
  const oneRepMax = sessions
    .filter((session) => session.e1rmKg != null)
    .map((session) => ({ label: shortDate(session.date), value: session.e1rmKg as number }));
  const volume = sessions.map((session) => ({
    label: shortDate(session.date),
    value: session.volumeKg,
  }));
  const delta1rm =
    data && data.first1rmKg != null && data.current1rmKg != null
      ? Math.round((data.current1rmKg - data.first1rmKg) * 10) / 10
      : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>
                {data?.name ?? 'Progression'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {data?.muscleGroup ?? 'Exercise'}
              </ThemedText>
            </View>
          </View>

          {data && sessions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="trending-up-outline" size={28} color={theme.accent} />
              </View>
              <ThemedText type="smallBold">No sessions logged yet</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Log a workout that includes this exercise and your progression will show up here.
              </ThemedText>
            </Card>
          ) : null}

          {data && sessions.length > 0 ? (
            <>
              <View style={styles.stats}>
                <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="title" style={styles.statValue}>
                    {data.totalSessions}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sessions
                  </ThemedText>
                </View>
                <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="title" style={styles.statValue}>
                    {data.best1rmKg != null ? formatKg(data.best1rmKg) : '—'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Best 1RM
                  </ThemedText>
                </View>
                <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="title" style={styles.statValue}>
                    {data.current1rmKg != null ? formatKg(data.current1rmKg) : '—'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Current 1RM
                  </ThemedText>
                </View>
                <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="title" style={styles.statValue}>
                    {data.totalVolumeKg}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Total volume kg
                  </ThemedText>
                </View>
              </View>

              {delta1rm != null ? (
                <View style={styles.deltaRow}>
                  <Ionicons
                    name={delta1rm >= 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={delta1rm >= 0 ? theme.success : theme.warning}
                  />
                  <ThemedText type="smallBold" style={{ color: delta1rm >= 0 ? theme.success : theme.warning }}>
                    {delta1rm >= 0 ? '+' : ''}
                    {formatKg(Math.abs(delta1rm))} kg estimated 1RM since the first session
                  </ThemedText>
                </View>
              ) : null}

              <Card style={styles.chartCard}>
                <ThemedText type="smallBold">Estimated 1RM</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Top working set each session, Epley formula
                </ThemedText>
                <LineChart
                  data={oneRepMax}
                  color={theme.accent}
                  formatValue={(value) => formatKg(value)}
                  emptyText="Log weights to see your estimated 1RM trend"
                />
              </Card>

              <Card style={styles.chartCard}>
                <ThemedText type="smallBold">Volume per session</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Total kg moved (sets × reps × weight)
                </ThemedText>
                <LineChart
                  data={volume}
                  color={theme.success}
                  formatValue={(value) => String(Math.round(value))}
                  emptyText="Log weights to see your volume trend"
                />
              </Card>

              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                Sessions
              </ThemedText>
              {sessions.map((session, index) => (
                <Card key={session.date} style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <View style={styles.sessionText}>
                      <ThemedText type="smallBold">
                        Session {index + 1}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {fullDate(session.date)} · {session.sets} set
                        {session.sets === 1 ? '' : 's'} · {session.totalReps} reps
                      </ThemedText>
                    </View>
                    <View style={styles.sessionStats}>
                      <ThemedText type="smallBold">
                        {session.e1rmKg != null ? `${formatKg(session.e1rmKg)} kg 1RM` : '—'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {Math.round(session.volumeKg)} kg
                        {session.bestWeightKg != null
                          ? ` · top ${formatKg(session.bestWeightKg)} kg`
                          : ''}
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
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
    fontSize: 26,
    lineHeight: 32,
  },
  emptyCard: {
    padding: Spacing.four,
    gap: Spacing.two,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 28,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  chartCard: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCard: {
    padding: Spacing.three,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sessionText: {
    flex: 1,
    gap: Spacing.half,
  },
  sessionStats: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
});
