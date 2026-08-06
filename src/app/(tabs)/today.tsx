import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChecklistItem } from '@/components/dashboard/checklist-item';
import { LevelToggle } from '@/components/dashboard/level-toggle';
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { DailyTimeline } from '@/components/dashboard/timeline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatMinutes } from '@/domain/dashboard/buildDailyPlan';
import { greetingFor, progressMessage } from '@/domain/dashboard/copy';
import { toggleCompletion } from '@/domain/dashboard/completions';
import type { DailyPlan, DailyPlanItem } from '@/domain/dashboard/types';
import {
  TIME_BLOCK_LABELS,
  timeBlockFromDate,
  type TimeBlock,
} from '@/domain/scheduling/anchors';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useTheme } from '@/hooks/use-theme';
import { useUIStore, type TodayView } from '@/stores/uiStore';
import { dateKey } from '@/lib/dates';

const BLOCK_OPTIONS: TimeBlock[] = ['morning', 'afternoon', 'night'];

export default function TodayScreen() {
  const [today, setToday] = useState(() => new Date());
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock>(() => timeBlockFromDate(today));
  const plan = useDailyPlan(today);
  const activeLevel = useUIStore((state) => state.activeLevel);
  const setActiveLevel = useUIStore((state) => state.setActiveLevel);
  const todayView = useUIStore((state) => state.todayView);
  const setTodayView = useUIStore((state) => state.setTodayView);

  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      if (dateKey(now) !== dateKey(today)) {
        setToday(now);
        setSelectedBlock(timeBlockFromDate(now));
      }
    };
    const interval = setInterval(refresh, 30_000);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      appState.remove();
    };
  }, [today]);

  const handleToggle = (item: DailyPlanItem) => {
    void toggleCompletion(item.actionId, today, item.completed);
  };

  const dateLabel = format(today, 'EEEE, MMMM d');

  const blockItems = plan?.items.filter((item) => item.timeBlock === selectedBlock) ?? [];
  const flexibleItems = plan?.items.filter((item) => item.timeBlock === 'flexible') ?? [];

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

              <BlockSelector value={selectedBlock} onChange={setSelectedBlock} />

              <ViewToggle value={todayView} onChange={setTodayView} />

              {todayView === 'timeline' ? (
                blockItems.length > 0 ? (
                  <DailyTimeline plan={plan} block={selectedBlock} onToggle={handleToggle} />
                ) : (
                  <EmptyBlock block={selectedBlock} />
                )
              ) : (
                <>
                  {flexibleItems.length > 0 ? (
                    <View style={styles.section}>
                      <SectionTitle>Anytime</SectionTitle>
                      <Card>
                        {flexibleItems.map((item) => (
                          <ChecklistItem key={item.actionId} item={item} onToggle={handleToggle} />
                        ))}
                      </Card>
                    </View>
                  ) : null}

                  {blockItems.length > 0 ? (
                    <View style={styles.section}>
                      <SectionTitle>{TIME_BLOCK_LABELS[selectedBlock]}</SectionTitle>
                      <Card>
                        {blockItems.map((item) => (
                          <ChecklistItem key={item.actionId} item={item} onToggle={handleToggle} />
                        ))}
                      </Card>
                    </View>
                  ) : (
                    <EmptyBlock block={selectedBlock} />
                  )}
                </>
              )}
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

function BlockSelector({ value, onChange }: { value: TimeBlock; onChange: (block: TimeBlock) => void }) {
  const theme = useTheme();

  return (
    <View style={styles.blockSelector}>
      {BLOCK_OPTIONS.map((block) => {
        const selected = block === value;
        return (
          <Pressable
            key={block}
            onPress={() => onChange(block)}
            style={({ pressed }) => [
              styles.blockPill,
              {
                backgroundColor: selected ? theme.accent : theme.backgroundSelected,
                opacity: pressed && !selected ? 0.7 : 1,
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={{ color: selected ? theme.background : theme.text }}>
              {TIME_BLOCK_LABELS[block]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmptyBlock({ block }: { block: TimeBlock }) {
  return (
    <Card>
      <ThemedText type="small" themeColor="textSecondary">
        Nothing scheduled for {TIME_BLOCK_LABELS[block]}. Enjoy the time.
      </ThemedText>
    </Card>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: TodayView;
  onChange: (view: TodayView) => void;
}) {
  const theme = useTheme();
  const isList = value === 'list';

  return (
    <Pressable
      onPress={() => onChange(isList ? 'timeline' : 'list')}
      style={({ pressed }) => [
        styles.viewButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons
        name={isList ? 'time-outline' : 'list-outline'}
        size={18}
        color={theme.text}
      />
      <ThemedText type="smallBold" style={styles.viewButtonLabel}>
        {isList ? 'Timeline' : 'List'}
      </ThemedText>
      <Ionicons name="swap-horizontal" size={16} color={theme.textSecondary} />
    </Pressable>
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
  sectionTitle: {
    marginTop: Spacing.two,
  },
  blockSelector: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  blockPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  viewButtonLabel: {
    flex: 1,
    textTransform: 'capitalize',
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
});
