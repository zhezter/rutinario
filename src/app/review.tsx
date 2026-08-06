import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, startOfWeek, subDays } from 'date-fns';
import { router, Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getWeekReview,
  type ReviewDayStat,
  type RoutineWeekStat,
  type WeekReview,
} from '@/domain/dashboard/review';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';
import { dateKey } from '@/lib/dates';
import { domainColor } from '@/lib/domainColor';

export default function ReviewScreen() {
  const theme = useTheme();
  const [weekEnd, setWeekEnd] = useState(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
  const [review, setReview] = useState<WeekReview | null>(null);

  const refetch = useCallback(() => {
    void getWeekReview(weekEnd).then(setReview);
  }, [weekEnd]);

  useLiveTables(
    ['completions', 'actions', 'procedures', 'routines', 'systems', 'domains'],
    refetch,
    [refetch],
  );

  const currentWeekStartKey = dateKey(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const isCurrentWeek = review?.startKey === currentWeekStartKey;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Weekly review' }} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </Pressable>
            <ThemedText type="title" style={styles.title}>
              Weekly review
            </ThemedText>
          </View>

          {review ? (
            <>
              <View style={styles.weekNav}>
                <WeekChevron icon="chevron-back" onPress={() => setWeekEnd((prev) => subDays(prev, 7))} />
                <Pressable
                  onPress={isCurrentWeek ? undefined : () => setWeekEnd(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6))}
                  disabled={isCurrentWeek}>
                  <ThemedText type="smallBold" themeColor={isCurrentWeek ? 'text' : 'accent'}>
                    {review.startLabel} – {review.endLabel}
                    {!isCurrentWeek ? ' · this week' : ''}
                  </ThemedText>
                </Pressable>
                <WeekChevron
                  icon="chevron-forward"
                  onPress={() => setWeekEnd((prev) => addDays(prev, 7))}
                  disabled={isCurrentWeek}
                />
              </View>

              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View>
                    <ThemedText style={styles.summaryCount}>
                      {review.completed}/{review.expected}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      completions this week
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.summaryPct, { color: theme.accent }]}>
                    {review.pct}%
                  </ThemedText>
                </View>
                <ProgressBar
                  completed={review.completed}
                  total={review.expected}
                  color={review.pct === 100 ? theme.success : theme.accent}
                />
                {review.expected > 0 ? (
                  <View style={styles.bestWorstRow}>
                    <StatPill label="Best" value={review.bestDay?.label} themeColor={theme.success} />
                    <StatPill label="Worst" value={review.worstDay?.label} themeColor={theme.warning} />
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    No daily tasks in this week.
                  </ThemedText>
                )}
              </Card>

              {review.routines.length > 0 ? (
                <View style={styles.section}>
                  <SectionTitle>By routine</SectionTitle>
                  <Card style={styles.routinesCard}>
                    {review.routines.map((routine) => (
                      <RoutineWeekRow key={routine.routineId} routine={routine} />
                    ))}
                  </Card>
                </View>
              ) : null}

              {review.days.some((d) => d.expected > 0) ? (
                <View style={styles.section}>
                  <SectionTitle>Day by day</SectionTitle>
                  <Card style={styles.daysCard}>
                    {review.days.map((day) => (
                      <DayRow key={day.date} day={day} />
                    ))}
                  </Card>
                </View>
              ) : null}
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Getting things ready…
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function WeekChevron({
  icon,
  onPress,
  disabled,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.weekChevron,
        { backgroundColor: theme.backgroundSelected },
        disabled && { opacity: 0.3 },
        pressed && !disabled && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={16} color={theme.text} />
    </Pressable>
  );
}

function StatPill({ label, value, themeColor }: { label: string; value?: string; themeColor: string }) {
  return (
    <View style={styles.pillRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}:
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: themeColor }}>
        {value ?? '—'}
      </ThemedText>
    </View>
  );
}

function RoutineWeekRow({ routine }: { routine: RoutineWeekStat }) {
  return (
    <View style={styles.routineRow}>
      <View style={styles.routineNameRow}>
        <View style={[styles.domainDot, { backgroundColor: domainColor(routine.domainName) }]} />
        <ThemedText type="smallBold" style={styles.routineName}>
          {routine.routineName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {routine.completed}/{routine.expected}
        </ThemedText>
      </View>
      <ProgressBar completed={routine.completed} total={routine.expected} />
    </View>
  );
}

function DayRow({ day }: { day: ReviewDayStat }) {
  const theme = useTheme();
  return (
    <View style={styles.dayRow}>
      <ThemedText type="smallBold" style={styles.dayLabel}>
        {day.label}
      </ThemedText>
      <View style={styles.dayBarTrack}>
        <View
          style={[
            styles.dayBar,
            { backgroundColor: theme.accent, width: `${day.pct}%` },
          ]}
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {day.pct}%
      </ThemedText>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <ThemedText type="smallBold" style={styles.sectionTitle}>
      {children}
    </ThemedText>
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  weekChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    gap: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  summaryCount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
  },
  summaryPct: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
  },
  bestWorstRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  routinesCard: {
    gap: Spacing.three,
  },
  routineRow: {
    gap: Spacing.one,
  },
  routineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routineName: {
    flex: 1,
  },
  daysCard: {
    gap: Spacing.two,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dayLabel: {
    width: 44,
  },
  dayBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  dayBar: {
    height: 8,
    borderRadius: 4,
  },
});
