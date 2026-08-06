import { Ionicons } from '@expo/vector-icons';
import { addDays, format, subDays } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChecklistItem } from '@/components/dashboard/checklist-item';
import { EnergyCheckIn } from '@/components/dashboard/energy-checkin';
import { LevelToggle } from '@/components/dashboard/level-toggle';
import { ProgressBar } from '@/components/dashboard/progress-bar';
import { DailyTimeline } from '@/components/dashboard/timeline';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatMinutes } from '@/domain/dashboard/buildDailyPlan';
import { greetingFor, progressMessage } from '@/domain/dashboard/copy';
import { toggleCompletion } from '@/domain/dashboard/completions';
import {
  getEnergyCheckinDate,
  getStoredEnergyLevel,
  saveEnergyCheckin,
} from '@/domain/dashboard/energyCheckin';
import type { ActiveLevel, DailyPlan, DailyPlanItem } from '@/domain/dashboard/types';
import {
  TIME_BLOCK_LABELS,
  timeBlockFromDate,
  type TimeBlock,
} from '@/domain/scheduling/anchors';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useDayNote } from '@/hooks/useDayNote';
import { useTheme } from '@/hooks/use-theme';
import { useUIStore, type TodayView } from '@/stores/uiStore';
import { dateKey } from '@/lib/dates';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';

const BLOCK_OPTIONS: TimeBlock[] = ['morning', 'afternoon', 'night'];

export default function TodayScreen() {
  const [today, setToday] = useState(() => new Date());
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock>(() => timeBlockFromDate(today));
  const [showEnergyCheckIn, setShowEnergyCheckIn] = useState(false);
  const plan = useDailyPlan(viewDate);
  const theme = useTheme();
  const activeLevel = useUIStore((state) => state.activeLevel);
  const setActiveLevel = useUIStore((state) => state.setActiveLevel);
  const todayView = useUIStore((state) => state.todayView);
  const setTodayView = useUIStore((state) => state.setTodayView);

  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      if (dateKey(now) !== dateKey(today)) {
        setToday(now);
        setViewDate(now);
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

  const isViewingToday = dateKey(viewDate) === dateKey(today);

  useEffect(() => {
    if (!isViewingToday || !plan || plan.items.length === 0) return;
    let cancelled = false;
    void (async () => {
      const [storedDate, storedLevel] = await Promise.all([
        getEnergyCheckinDate(),
        getStoredEnergyLevel(),
      ]);
      if (cancelled) return;
      if (storedLevel) setActiveLevel(storedLevel);
      if (storedDate !== dateKey(today)) setShowEnergyCheckIn(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isViewingToday, plan, today, setActiveLevel]);

  const handleEnergySelect = (level: ActiveLevel) => {
    hapticSuccess();
    setActiveLevel(level);
    setShowEnergyCheckIn(false);
    void saveEnergyCheckin(level, dateKey(today));
  };

  const goToPrevDay = () => setViewDate((prev) => subDays(prev, 1));
  const goToNextDay = () =>
    setViewDate((prev) => (dateKey(prev) === dateKey(today) ? prev : addDays(prev, 1)));
  const goToToday = () => setViewDate(today);

  const handleToggle = (item: DailyPlanItem) => {
    hapticSelection();
    void toggleCompletion(item.actionId, viewDate, item.completed);
  };

  const missedCount = isViewingToday
    ? 0
    : (plan?.items.filter((item) => !item.completed).length ?? 0);

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
              <View style={styles.dateRow}>
                <DateChevron icon="chevron-back" onPress={goToPrevDay} />
                <Pressable onPress={isViewingToday ? undefined : goToToday} disabled={isViewingToday}>
                  <ThemedText
                    type="small"
                    style={{
                      color: isViewingToday
                        ? theme.textSecondary
                        : missedCount > 0
                          ? theme.warning
                          : theme.success,
                    }}>
                    {format(viewDate, 'EEEE, MMMM d')}
                    {!isViewingToday ? ' · back to today' : ''}
                  </ThemedText>
                </Pressable>
                <DateChevron icon="chevron-forward" onPress={goToNextDay} disabled={isViewingToday} />
              </View>
            </View>
            <LevelToggle value={activeLevel} onChange={setActiveLevel} />
          </View>

          {plan ? (
            <>
              <PlanHero plan={plan} doneLabel={isViewingToday ? 'done today' : 'done'} />

              {!isViewingToday ? (
                missedCount > 0 ? (
                  <View style={[styles.readOnlyNote, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="alert-circle" size={14} color={theme.warning} />
                    <ThemedText type="small" style={{ color: theme.warning }}>
                      {missedCount} {missedCount === 1 ? 'task' : 'tasks'} not completed that day.
                      Past days are read-only.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={[styles.readOnlyNote, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="checkmark-circle" size={14} color={theme.success} />
                    <ThemedText type="small" style={{ color: theme.success }}>
                      All tasks were completed that day.
                    </ThemedText>
                  </View>
                )
              ) : null}

              {isViewingToday && plan.items.length > 0 ? (
                <PrimaryButton label="Run today's plan" onPress={() => router.push('/run-day')} />
              ) : null}

              <BlockSelector value={selectedBlock} onChange={setSelectedBlock} />

              <ViewToggle value={todayView} onChange={setTodayView} />

              {todayView === 'timeline' ? (
                blockItems.length > 0 ? (
                  <DailyTimeline
                    plan={plan}
                    block={selectedBlock}
                    onToggle={handleToggle}
                    disabled={!isViewingToday}
                  />
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
                          <ChecklistItem
                            key={item.actionId}
                            item={item}
                            onToggle={handleToggle}
                            disabled={!isViewingToday}
                          />
                        ))}
                      </Card>
                    </View>
                  ) : null}

                  {blockItems.length > 0 ? (
                    <View style={styles.section}>
                      <SectionTitle>{TIME_BLOCK_LABELS[selectedBlock]}</SectionTitle>
                      <Card>
                        {blockItems.map((item) => (
                          <ChecklistItem
                            key={item.actionId}
                            item={item}
                            onToggle={handleToggle}
                            disabled={!isViewingToday}
                          />
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

          <DayNoteCard date={dateKey(viewDate)} />
        </ScrollView>
      </SafeAreaView>

      <EnergyCheckIn
        visible={showEnergyCheckIn}
        onSelect={handleEnergySelect}
        onClose={() => setShowEnergyCheckIn(false)}
      />
    </ThemedView>
  );
}

function DateChevron({
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
        styles.dateChevron,
        { backgroundColor: theme.backgroundSelected },
        disabled && { opacity: 0.3 },
        pressed && !disabled && { opacity: 0.7 },
      ]}>
      <Ionicons name={icon} size={16} color={theme.text} />
    </Pressable>
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

function PlanHero({ plan, doneLabel }: { plan: DailyPlan; doneLabel: string }) {
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
            {doneLabel}
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

function DayNoteCard({ date }: { date: string }) {
  const theme = useTheme();
  const { note, changeNote, dirty, save } = useDayNote(date);

  return (
    <View style={styles.section}>
      <SectionTitle>Day note</SectionTitle>
      <Card style={styles.noteCard}>
        <TextInput
          value={note}
          onChangeText={changeNote}
          onBlur={() => {
            if (dirty) void save();
          }}
          multiline
          placeholder="How was this day? Mood, energy, wins, anything on your mind…"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.noteInput,
            { backgroundColor: theme.backgroundSelected, color: theme.text },
          ]}
        />
        {dirty ? (
          <View style={styles.noteFooter}>
            <GhostButton label="Save note" onPress={() => void save()} />
          </View>
        ) : null}
      </Card>
    </View>
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 2,
  },
  dateChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 32,
    lineHeight: 38,
  },
  section: {
    gap: Spacing.two,
  },
  readOnlyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  noteCard: {
    gap: Spacing.two,
  },
  noteInput: {
    minHeight: 72,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  noteFooter: {
    alignItems: 'flex-end',
  },
});
