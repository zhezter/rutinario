import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getStatsSnapshot, type DomainStat, type StatsSnapshot } from '@/domain/dashboard/stats';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';
import { domainColor } from '@/lib/domainColor';

const BAR_AREA_HEIGHT = 110;

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
});
