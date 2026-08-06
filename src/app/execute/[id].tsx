import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { setCompleted, setNotCompleted } from '@/domain/dashboard/completions';
import { useActionCompletions } from '@/hooks/useActionCompletions';
import { useRoutine } from '@/hooks/useRoutine';
import { useTheme } from '@/hooks/use-theme';

type ExecStep = {
  actionId: number;
  name: string;
  description: string | null;
  instructions: string | null;
  product: string | null;
  durationMin: number | null;
  procedureName: string;
};

export default function ExecuteRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = useRoutine(Number(id));
  const [today] = useState(() => new Date());

  const steps = useMemo<ExecStep[]>(
    () =>
      (routine?.procedures ?? []).flatMap((procedure) =>
        procedure.actions.map((action) => ({
          actionId: action.id,
          name: action.name,
          description: action.description,
          instructions: action.instructions,
          product: action.product,
          durationMin: action.durationMin,
          procedureName: procedure.name,
        })),
      ),
    [routine],
  );

  const { loaded, completed } = useActionCompletions(
    steps.map((step) => step.actionId),
    today,
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!loaded || steps.length === 0 || initializedRef.current) return;
    const firstPending = steps.findIndex((step) => !completed.has(step.actionId));
    setCurrentIndex(firstPending === -1 ? 0 : firstPending);
    initializedRef.current = true;
  }, [loaded, steps, completed]);

  if (!routine) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Execute' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Getting things ready…
        </ThemedText>
      </ThemedView>
    );
  }

  const doneCount = steps.filter((step) => completed.has(step.actionId)).length;
  const allDone = steps.length > 0 && doneCount === steps.length;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: routine.name }} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {steps.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle">No steps yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Add steps to this routine to guide it step by step.
            </ThemedText>
            <GhostButton label="Back" onPress={() => router.back()} />
          </View>
        ) : allDone ? (
          <CompletionView
            routineName={routine.name}
            onFinish={() => router.back()}
            onGoToToday={() => router.dismissTo('/today')}
          />
        ) : (
          <Executor
            steps={steps}
            completed={completed}
            currentIndex={currentIndex}
            doneCount={doneCount}
            onDone={() => void setCompleted(steps[currentIndex].actionId, today)}
            onUndo={() => void setNotCompleted(steps[currentIndex].actionId, today)}
            onSkip={advancePending}
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
    for (let i = from + 1; i < steps.length; i++) {
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
  onDone,
  onUndo,
  onSkip,
  onGoTo,
  onPrevious,
  onNext,
}: {
  steps: ExecStep[];
  completed: Map<number, number>;
  currentIndex: number;
  doneCount: number;
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

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Card style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressCount}>
            {doneCount}/{steps.length}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            steps done
          </ThemedText>
        </View>
        <ProgressBar
          completed={doneCount}
          total={steps.length}
          color={doneCount === steps.length ? theme.success : theme.accent}
        />
      </Card>

      <Card style={styles.focusCard}>
        <ThemedText type="small" themeColor="textSecondary">
          {current.procedureName}
        </ThemedText>
        <ThemedText type="subtitle">{current.name}</ThemedText>
        {current.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {current.description}
          </ThemedText>
        ) : null}
        {current.durationMin != null || current.product ? (
          <ThemedText type="small" themeColor="textSecondary">
            {[current.durationMin ? `${current.durationMin} min` : null, current.product]
              .filter((part): part is string => part !== null)
              .join(' · ')}
          </ThemedText>
        ) : null}
        {current.instructions ? (
          <View style={[styles.instructionsBox, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold">Instructions</ThemedText>
            <ThemedText type="small">{current.instructions}</ThemedText>
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
                  style={stepDone && { textDecorationLine: 'line-through', color: theme.textSecondary }}>
                  {index + 1}. {step.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {step.procedureName}
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

function CompletionView({
  routineName,
  onFinish,
  onGoToToday,
}: {
  routineName: string;
  onFinish: () => void;
  onGoToToday: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.complete}>
      <View style={[styles.completeBadge, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark" size={44} color={theme.background} />
      </View>
      <ThemedText type="subtitle" style={styles.completeTitle}>
        Routine complete
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.completeText}>
        {routineName} — every step done. Nice work.
      </ThemedText>
      <View style={styles.completeButtons}>
        <PrimaryButton label="Back to routine" onPress={onFinish} />
        <GhostButton label="Go to Today" onPress={onGoToToday} />
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
  instructionsBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.one,
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
