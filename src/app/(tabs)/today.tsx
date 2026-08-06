import { format } from 'date-fns';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChecklistItem } from '@/components/dashboard/checklist-item';
import { LevelToggle } from '@/components/dashboard/level-toggle';
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { DailyTimeline } from '@/components/dashboard/timeline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { PillGroup } from '@/components/ui/pill-group';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatMinutes } from '@/domain/dashboard/buildDailyPlan';
import { greetingFor, progressMessage } from '@/domain/dashboard/copy';
import { toggleCompletion } from '@/domain/dashboard/completions';
import type { CategoryProgress, DailyPlan, DailyPlanItem } from '@/domain/dashboard/types';
import { TIME_BLOCK_LABELS, TIME_BLOCK_ORDER } from '@/domain/scheduling/anchors';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useTheme } from '@/hooks/use-theme';
import { domainColor } from '@/lib/domainColor';
import { useUIStore, type TodayView } from '@/stores/uiStore';

const VIEW_OPTIONS = ['list', 'timeline'] as const;
const VIEW_LABELS: Record<(typeof VIEW_OPTIONS)[number], string> = {
  list: 'List',
  timeline: 'Timeline',
};

export default function TodayScreen() {
  const [today] = useState(() => new Date());
  const plan = useDailyPlan(today);
  const activeLevel = useUIStore((state) => state.activeLevel);
  const setActiveLevel = useUIStore((state) => state.setActiveLevel);
  const todayView = useUIStore((state) => state.todayView);
  const setTodayView = useUIStore((state) => state.setTodayView);

  const handleViewChange = (view: TodayView) => {
    setTodayView(view);
  };

  const handleToggle = (item: DailyPlanItem) => {
    void toggleCompletion(item.actionId, today, item.completed);
  };

  const dateLabel = format(today, 'EEEE, MMMM d');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.greeting}>
                {greetingFor(today)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {dateLabel}
              </ThemedText>
            </View>
            <LevelToggle value={activeLevel} onChange={setActiveLevel} />
          </View>

          {plan ? (
            <>
              <PlanHero plan={plan} />

              <View style={styles.section}>
                <View style={styles.planHeader}>
                  <SectionTitle>{"Today's plan"}</SectionTitle>
                  <PillGroup
                    options={VIEW_OPTIONS}
                    value={todayView}
                    onChange={handleViewChange}
                    labels={VIEW_LABELS}
                  />
                </View>

                {plan.items.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Nothing planned for today. Enjoy the day.
                  </ThemedText>
                ) : todayView === 'timeline' ? (
                  <DailyTimeline plan={plan} onToggle={handleToggle} />
                ) : (
                  <>
                    <Card style={styles.categoriesCard}>
                      {plan.categories.map((category) => (
                        <CategoryRow key={category.domainName} category={category} />
                      ))}
                    </Card>

                    {TIME_BLOCK_ORDER.map((block) => {
                      const items = plan.items.filter((item) => item.timeBlock === block);
                      if (items.length === 0) return null;
                      return (
                        <View key={block} style={styles.section}>
                          <SectionTitle>{TIME_BLOCK_LABELS[block]}</SectionTitle>
                          <Card>
                            {items.map((item) => (
                              <ChecklistItem key={item.actionId} item={item} onToggle={handleToggle} />
                            ))}
                          </Card>
                        </View>
                      );
                    })}
                  </>
                )}
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

function PlanHero({ plan }: { plan: DailyPlan }) {
  const theme = useTheme();
  const { completed, total } = {
    completed: plan.items.filter((item) => item.completed).length,
    total: plan.items.length,
  };

  return (
    <Card style={styles.hero}>
      <View style={styles.heroRow}>
        <View>
          <ThemedText style={styles.heroCount}>
            {completed}/{total}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            done today
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.heroTime}>
          {total > 0 ? `about ${formatMinutes(plan.plannedMinutes)} planned` : ''}
        </ThemedText>
      </View>

      {total > 0 && (
        <ProgressBar
          completed={completed}
          total={total}
          color={completed === total ? theme.success : theme.accent}
        />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {progressMessage(completed, total)}
      </ThemedText>
    </Card>
  );
}

function CategoryRow({ category }: { category: CategoryProgress }) {
  return (
    <View style={styles.categoryRow}>
      <View style={styles.categoryNameRow}>
        <View style={[styles.categoryDot, { backgroundColor: domainColor(category.domainName) }]} />
        <ThemedText type="smallBold" style={styles.categoryName}>
          {category.domainName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {category.completed}/{category.total}
        </ThemedText>
      </View>
      <ProgressBar completed={category.completed} total={category.total} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 32,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.two,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
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
  },
  heroCount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
  },
  heroTime: {
    marginBottom: 4,
  },
  categoriesCard: {
    gap: Spacing.three,
  },
  categoryRow: {
    gap: Spacing.one,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    flex: 1,
  },
});
