import Ionicons from '@expo/vector-icons/Ionicons';
import { addDays, subDays } from 'date-fns';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  getStatsSnapshot,
  type CalendarDay,
  type DomainStat,
  type RoutineTrendStat,
  type StatsSnapshot,
} from '@/domain/dashboard/stats';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';
import { dateKey } from '@/lib/dates';
import { domainColor } from '@/lib/domainColor';

const BAR_AREA_HEIGHT = 110;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StatsScreen() {
  const theme = useTheme();
  const [stats, setStats] = useState<StatsSnapshot | null>(null);

  useLiveTables(
    ['completions', 'actions', 'procedures', 'routines', 'systems', 'domains'],
    () => {
      void getStatsSnapshot().then(setStats);
    },
    [],
  );

  const hasData = (stats?.weekCompleted ?? 0) > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title" style={styles.title}>
            Stats
          </ThemedText>

          <Pressable
            onPress={() => router.push('/review')}
            style={({ pressed }) => [
              styles.reviewButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && { opacity: 0.7 },
            ]}>
            <Ionicons name="calendar-outline" size={18} color={theme.accent} />
            <ThemedText type="smallBold" style={styles.reviewButtonLabel}>
              Weekly review
            </ThemedText>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>

          {stats ? (
            <>
              <StreakHero streak={stats.streak} weekCompleted={stats.weekCompleted} />

              <View style={styles.section}>
                <SectionTitle>Last 7 days</SectionTitle>
                <Card>
                  {hasData ? (
                    <View style={styles.bars}>
                      {stats.days.map((day) => {
                        const height =
                          day.pct > 0
                            ? Math.max(3, (day.pct / 100) * BAR_AREA_HEIGHT)
                            : 2;
                        return (
                          <View key={day.date} style={styles.barColumn}>
                            <View style={styles.barArea}>
                              <View
                                style={[
                                  styles.bar,
                                  {
                                    height,
                                    backgroundColor:
                                      day.pct > 0 ? theme.accent : theme.backgroundSelected,
                                  },
                                ]}
                              />
                            </View>
                            <ThemedText
                              type="small"
                              style={[
                                styles.barLabel,
                                day.isToday && { color: theme.accent, fontWeight: 700 },
                              ]}>
                              {day.label}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {day.pct}%
                            </ThemedText>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Complete a few tasks to see your weekly progress.
                    </ThemedText>
                  )}
                </Card>
              </View>

              <View style={styles.section}>
                <SectionTitle>Recent weeks</SectionTitle>
                <Card>
                  <CalendarHeatmap calendar={stats.calendar} />
                </Card>
              </View>

              <View style={styles.section}>
                <SectionTitle>By domain</SectionTitle>
                <Card style={styles.domainsCard}>
                  {stats.domains.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No daily tasks yet. Add them in a routine to see per-domain progress.
                    </ThemedText>
                  ) : (
                    stats.domains.map((domain) => (
                      <DomainRow key={domain.name} domain={domain} />
                    ))
                  )}
                </Card>
              </View>

              <View style={styles.section}>
                <SectionTitle>Routines — last 8 weeks</SectionTitle>
                <Card style={styles.domainsCard}>
                  {stats.routineTrend.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No routines with daily tasks yet.
                    </ThemedText>
                  ) : (
                    <>
                      {stats.routineTrend.map((routine) => (
                        <RoutineTrendRow key={routine.routineId} routine={routine} />
                      ))}
                      <View style={styles.legendRow}>
                        <ThemedText type="small" themeColor="textSecondary">
                          Less
                        </ThemedText>
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <View
                            key={pct}
                            style={[
                              styles.legendCell,
                              { backgroundColor: heatColor(pct, theme.accent, theme.backgroundSelected) },
                            ]}
                          />
                        ))}
                        <ThemedText type="small" themeColor="textSecondary">
                          More
                        </ThemedText>
                      </View>
                    </>
                  )}
                </Card>
              </View>
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

function StreakHero({ streak, weekCompleted }: { streak: number; weekCompleted: number }) {
  const theme = useTheme();

  const message =
    streak === 0
      ? 'Complete a task today to start a streak.'
      : `${streak} day${streak === 1 ? '' : 's'} in a row — keep it going.`;

  return (
    <Card style={styles.hero}>
      <View style={styles.heroRow}>
        <View style={styles.heroCountRow}>
          <Ionicons name="flame" size={28} color={theme.accent} />
          <ThemedText style={styles.heroCount}>{streak}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {streak === 1 ? 'day' : 'days'} streak
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {weekCompleted} {weekCompleted === 1 ? 'completion' : 'completions'} this week
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </Card>
  );
}

function CalendarHeatmap({ calendar }: { calendar: CalendarDay[] }) {
  const theme = useTheme();
  if (calendar.length === 0) return null;

  const [y, m, d] = calendar[0].date.split('-').map(Number);
  const oldestDate = new Date(y, m - 1, d);
  const gridStart = subDays(oldestDate, oldestDate.getDay());
  const lastDate = calendar.at(-1)!;
  const [ly, lm, ld] = lastDate.date.split('-').map(Number);
  const todayDate = new Date(ly, lm - 1, ld);
  const spanDays = Math.round((todayDate.getTime() - gridStart.getTime()) / 86_400_000);
  const weekCount = Math.ceil((spanDays + 1) / 7);
  const pctByDate = new Map(calendar.map((day) => [day.date, day.pct]));

  const weeks: { date: string; pct: number; isToday: boolean }[][] = [];
  for (let w = 0; w < weekCount; w += 1) {
    const column: { date: string; pct: number; isToday: boolean }[] = [];
    for (let dow = 0; dow < 7; dow += 1) {
      const day = addDays(gridStart, w * 7 + dow);
      const key = dateKey(day);
      column.push({
        date: key,
        pct: pctByDate.get(key) ?? 0,
        isToday: key === lastDate.date,
      });
    }
    weeks.push(column);
  }

  return (
    <View style={styles.heatmap}>
      <View style={styles.heatmapRow}>
        <View style={styles.heatmapLabels}>
          {WEEKDAY_LABELS.map((label, dow) => (
            <ThemedText key={label} type="small" style={styles.heatmapLabel}>
              {label.slice(0, 2)}
            </ThemedText>
          ))}
        </View>
        <View style={styles.heatmapGrid}>
          {weeks.map((column, w) => (
            <View key={w} style={styles.heatmapColumn}>
              {column.map((day) => (
                <View
                  key={day.date}
                  style={[
                    styles.heatmapCell,
                    {
                      backgroundColor: heatColor(day.pct, theme.accent, theme.backgroundSelected),
                      borderWidth: day.isToday ? 1 : 0,
                      borderColor: day.isToday ? theme.accent : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.legendRow}>
        <ThemedText type="small" themeColor="textSecondary">
          Less
        </ThemedText>
        {[0, 25, 50, 75, 100].map((pct) => (
          <View
            key={pct}
            style={[
              styles.legendCell,
              { backgroundColor: heatColor(pct, theme.accent, theme.backgroundSelected) },
            ]}
          />
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          More
        </ThemedText>
      </View>
    </View>
  );
}

function heatColor(pct: number, accent: string, empty: string): string {
  if (pct <= 0) return empty;
  if (pct < 50) return accentWithOpacity(accent, 0.35);
  if (pct < 100) return accentWithOpacity(accent, 0.65);
  return accent;
}

function accentWithOpacity(hex: string, opacity: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function RoutineTrendRow({ routine }: { routine: RoutineTrendStat }) {
  const theme = useTheme();
  return (
    <View style={styles.trendRow}>
      <View style={styles.trendNameRow}>
        <View style={[styles.domainDot, { backgroundColor: domainColor(routine.domainName) }]} />
        <ThemedText type="smallBold" style={styles.domainName} numberOfLines={1}>
          {routine.routineName}
        </ThemedText>
      </View>
      <View style={styles.trendWeeks}>
        {routine.weeks.map((pct, index) => (
          <View
            key={index}
            style={[
              styles.trendCell,
              {
                backgroundColor:
                  pct === null
                    ? 'transparent'
                    : heatColor(pct, theme.accent, theme.backgroundSelected),
                borderWidth: pct === null ? 1 : 0,
                borderColor: theme.backgroundSelected,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function DomainRow({ domain }: { domain: DomainStat }) {
  return (
    <View style={styles.domainRow}>
      <View style={styles.domainNameRow}>
        <View style={[styles.domainDot, { backgroundColor: domainColor(domain.name) }]} />
        <ThemedText type="smallBold" style={styles.domainName}>
          {domain.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {domain.completed}/{domain.expected}
        </ThemedText>
      </View>
      <ProgressBar completed={domain.completed} total={domain.expected} />
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
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
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginTop: Spacing.two,
  },
  hero: {
    gap: Spacing.two,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  heroCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroCount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  barArea: {
    height: BAR_AREA_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
  },
  bar: {
    width: '100%',
    borderRadius: 3,
  },
  barLabel: {
    fontSize: 12,
  },
  domainsCard: {
    gap: Spacing.three,
  },
  domainRow: {
    gap: Spacing.one,
  },
  domainNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  domainName: {
    flex: 1,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  reviewButtonLabel: {
    flex: 1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  trendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '45%',
  },
  trendWeeks: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  trendCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 3,
  },
  heatmap: {
    gap: Spacing.two,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  heatmapLabels: {
    gap: 4,
  },
  heatmapLabel: {
    fontSize: 10,
    lineHeight: 16,
    width: 20,
    textAlign: 'center',
  },
  heatmapGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  heatmapColumn: {
    flex: 1,
    gap: 4,
  },
  heatmapCell: {
    aspectRatio: 1,
    borderRadius: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
