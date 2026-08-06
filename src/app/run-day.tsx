import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatMinutes } from '@/domain/dashboard/buildDailyPlan';
import { setCompleted, setNotCompleted } from '@/domain/dashboard/completions';
import { TIME_BLOCK_LABELS, TIME_BLOCK_ORDER } from '@/domain/scheduling/anchors';
import type { DailyPlanItem } from '@/domain/dashboard/types';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';

export default function RunDayScreen() {
  const [today] = useState(() => new Date());
  const plan = useDailyPlan(today);

  const steps = useMemo<DailyPlanItem[]>(() => {
    if (!plan) return [];
    const order = new Map(TIME_BLOCK_ORDER.map((block, index) => [block, index]));
    return [...plan.items].sort((a, b) => {
      const blockDiff = (order.get(a.timeBlock) ?? 99) - (order.get(b.timeBlock) ?? 99);
      if (blockDiff !== 0) return blockDiff;
      return (a.fixedTime ?? '').localeCompare(b.fixedTime ?? '');
    });
  }, [plan]);

  const completed = useMemo(
    () => new Set(steps.filter((step) => step.completed).map((step) => step.actionId)),
    [steps],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (steps.length === 0 || initializedRef.current) return;
    const firstPending = steps.findIndex((step) => !completed.has(step.actionId));
    setCurrentIndex(firstPending === -1 ? 0 : firstPending);
    initializedRef.current = true;
  }, [steps, completed]);

  const doneCount = steps.filter((step) => completed.has(step.actionId)).length;
  const allDone = steps.length > 0 && doneCount === steps.length;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: "Today's plan" }} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {!plan ? (
          <ThemedText type="small" themeColor="textSecondary">
            Getting things ready…
          </ThemedText>
        ) : steps.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle">Nothing scheduled</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              There is nothing on your plan today. Enjoy the day.
            </ThemedText>
            <GhostButton label="Back" onPress={() => router.back()} />
          </View>
        ) : allDone ? (
          <CompletionView onFinish={() => router.back()} onGoToToday={() => router.dismissTo('/today')} />
        ) : (
          <Executor
            steps={steps}
            completed={completed}
            currentIndex={currentIndex}
            doneCount={doneCount}
            plannedMinutes={plan.plannedMinutes}
            onDone={() => {
              hapticSuccess();
              void setCompleted(steps[currentIndex].actionId, today);
            }}
            onUndo={() => {
              hapticWarning();
              void setNotCompleted(steps[currentIndex].actionId, today);
            }}
            onSkip={() => {
              hapticSelection();
              advancePending();
            }}
            onGoTo={(index) => setCurrentIndex(index)}
            onPrevious={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            onNext={advancePending}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );

  function advancePending() {
    const from = Math.min(currentIndex, steps.length - 1);
    for (let i = from + 1; i < steps.length; i += 1) {
      if (!completed.has(steps[i].actionId)) {
        setCurrentIndex(i);
        return;
      }
    }
    setCurrentIndex(steps.length - 1);
  }
}

function Executor({
  steps,
  completed,
  currentIndex,
  doneCount,
  plannedMinutes,
  onDone,
  onUndo,
  onSkip,
  onGoTo,
  onPrevious,
  onNext,
}: {
  steps: DailyPlanItem[];
  completed: Set<number>;
  currentIndex: number;
  doneCount: number;
  plannedMinutes: number;
  onDone: () => void;
  onUndo: () => void;
  onSkip: () => void;
  onGoTo: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const theme = useTheme();
  const safeIndex = Math.min(currentIndex, steps.length - 1);
  const current = steps[safeIndex];
  const isCompleted = completed.has(current.actionId);

  const metaParts = [
    current.durationMin != null ? `${current.durationMin} min` : null,
    current.fixedTime ?? null,
    current.anchor ?? null,
    current.frequency,
  ].filter((part): part is string => part !== null && part !== '');

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressCount}>
            {doneCount}/{steps.length}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            done · {formatMinutes(plannedMinutes)} planned
          </ThemedText>
        </View>
        <ProgressBar
          completed={doneCount}
          total={steps.length}
          color={doneCount === steps.length ? theme.success : theme.accent}
        />
      </Card>

      <Card style={styles.focusCard}>
        <View style={styles.focusMetaRow}>
          <View style={[styles.blockChip, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" style={styles.blockChipText}>
              {TIME_BLOCK_LABELS[current.timeBlock]}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {current.domainName} · {current.routineName}
          </ThemedText>
        </View>
        <ThemedText type="subtitle">{current.name}</ThemedText>
        {current.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {current.description}
          </ThemedText>
        ) : null}
        {metaParts.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {metaParts.join(' · ')}
          </ThemedText>
        ) : null}
        {current.product ? (
          <View style={[styles.productBox, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="cube-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small">{current.product}</ThemedText>
          </View>
        ) : null}
      </Card>

      <View style={styles.controls}>
        {isCompleted ? (
          <GhostButton label="Undo" onPress={onUndo} color={theme.warning} />
        ) : (
          <PrimaryButton label="Mark done" onPress={onDone} />
        )}
        {!isCompleted ? <GhostButton label="Skip" onPress={onSkip} /> : null}
        <View style={styles.navRow}>
          <GhostButton label="Previous" onPress={onPrevious} />
          <GhostButton label="Next" onPress={onNext} />
        </View>
      </View>

      <Card style={styles.stepsCard}>
        <ThemedText type="smallBold">All steps</ThemedText>
        {steps.map((step, index) => {
          const stepDone = completed.has(step.actionId);
          const isCurrent = index === safeIndex;
          return (
            <Pressable
              key={step.actionId}
              onPress={() => onGoTo(index)}
              style={({ pressed }) => [
                styles.stepRow,
                isCurrent && { backgroundColor: theme.backgroundSelected },
                pressed && { opacity: 0.6 },
              ]}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    borderColor: stepDone ? theme.success : theme.textSecondary,
                    backgroundColor: stepDone ? theme.success : 'transparent',
                  },
                ]}>
                {stepDone && (
                  <ThemedText style={styles.stepCheck} themeColor="background">
                    ✓
                  </ThemedText>
                )}
              </View>
              <View style={styles.stepBody}>
                <ThemedText
                  type="smallBold"
                  style={
                    stepDone && { textDecorationLine: 'line-through', color: theme.textSecondary }
                  }>
                  {index + 1}. {step.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {TIME_BLOCK_LABELS[step.timeBlock]} · {step.routineName}
                </ThemedText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isCurrent ? theme.text : theme.textSecondary}
              />
            </Pressable>
          );
        })}
      </Card>
    </ScrollView>
  );
}

function CompletionView({ onFinish, onGoToToday }: { onFinish: () => void; onGoToToday: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.complete}>
      <View style={[styles.completeBadge, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark" size={44} color={theme.background} />
      </View>
      <ThemedText type="subtitle" style={styles.completeTitle}>
        Day complete
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.completeText}>
        Every task in your plan is done. Nice work.
      </ThemedText>
      <View style={styles.completeButtons}>
        <PrimaryButton label="Back to Today" onPress={onFinish} />
        <GhostButton label="Go to Stats" onPress={() => router.dismissTo('/stats')} />
      </View>
    </View>
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
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  progressCard: {
    gap: Spacing.three,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  progressCount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
  },
  focusCard: {
    gap: Spacing.two,
  },
  focusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  blockChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  blockChipText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 700,
  },
  productBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  controls: {
    gap: Spacing.two,
  },
  navRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepsCard: {
    gap: Spacing.one,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  stepIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheck: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: 700,
  },
  stepBody: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  complete: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  completeBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  completeTitle: {
    textAlign: 'center',
  },
  completeText: {
    textAlign: 'center',
  },
  completeButtons: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
    maxWidth: 360,
  },
});
