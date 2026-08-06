import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { getWorkoutDay } from '@/domain/workouts/workouts';
import {
  clearSet,
  getDayLogs,
  getExerciseBestWeight,
  recordSet,
} from '@/domain/workouts/runner';
import type { WorkoutDaySummary } from '@/domain/workouts/types';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

type WorkoutStep = {
  key: string;
  slotId: number;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string | null;
  setIndex: number;
  exerciseSets: number;
  targetWeight: string;
  targetReps: string;
  restSec: number;
};

type LoggedInfo = {
  weight: string;
  reps: string;
};

type RestState = {
  endsAt: number;
  total: number;
};

function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildSteps(day: WorkoutDaySummary): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  for (const slot of day.exercises) {
    for (let setIndex = 0; setIndex < slot.sets; setIndex++) {
      steps.push({
        key: `${slot.id}:${setIndex}`,
        slotId: slot.id,
        exerciseId: slot.exercise.id,
        exerciseName: slot.exercise.name,
        muscleGroup: slot.exercise.muscleGroup,
        setIndex,
        exerciseSets: slot.sets,
        targetWeight: slot.weightKg != null ? String(slot.weightKg) : '',
        targetReps: slot.reps,
        restSec: slot.restSec ?? day.restSec ?? 90,
      });
    }
  }
  return steps;
}

function prefillFor(steps: WorkoutStep[], done: Record<string, LoggedInfo>, index: number) {
  const step = steps[index];
  const existing = done[step.key];
  if (existing) return existing;
  for (let i = index - 1; i >= 0; i--) {
    if (steps[i].slotId === step.slotId && done[steps[i].key]) {
      return done[steps[i].key];
    }
  }
  return { weight: step.targetWeight, reps: step.targetReps };
}

export default function WorkoutRunScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const dayId = Number(params.dayId);
  const theme = useTheme();

  const [day, setDay] = useState<WorkoutDaySummary | null>(null);
  const [steps, setSteps] = useState<WorkoutStep[]>([]);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Record<string, LoggedInfo>>({});
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [phase, setPhase] = useState<'warmup' | 'workout' | 'done'>('warmup');
  const [rest, setRest] = useState<RestState | null>(null);
  const [pr, setPr] = useState<{ exerciseName: string; weight: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const currentRef = useRef(current);
  currentRef.current = current;
  const doneRef = useRef(done);
  doneRef.current = done;
  const weightRef = useRef(weight);
  weightRef.current = weight;
  const repsRef = useRef(reps);
  repsRef.current = reps;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const advance = () => {
    const allSteps = stepsRef.current;
    const next = currentRef.current + 1;
    if (next >= allSteps.length) {
      setRest(null);
      setPhase('done');
      return;
    }
    currentRef.current = next;
    setCurrent(next);
    const prefill = prefillFor(allSteps, doneRef.current, next);
    setWeight(prefill.weight);
    setReps(prefill.reps);
  };

  useEffect(() => {
    if (!rest) return;
    if (now >= rest.endsAt) {
      setRest(null);
      hapticSuccess();
      advance();
    }
  }, [now, rest]);

  useEffect(() => {
    if (!pr) return;
    const id = setTimeout(() => setPr(null), 3500);
    return () => clearTimeout(id);
  }, [pr]);

  useLiveTables(
    ['workout_days', 'workout_exercises', 'exercises', 'exercise_logs'],
    async () => {
      const loaded = await getWorkoutDay(dayId);
      if (!loaded) {
        router.back();
        return;
      }
      const logs = await getDayLogs(
        loaded.exercises.map((slot) => slot.id),
        new Date(),
      );
      const allSteps = buildSteps(loaded);
      const doneState: Record<string, LoggedInfo> = {};
      for (const step of allSteps) {
        const log = logs
          .get(step.slotId)
          ?.find((entry) => entry.setIndex === step.setIndex);
        if (log) {
          doneState[step.key] = {
            weight: log.weightKg != null ? String(log.weightKg) : step.targetWeight,
            reps: String(log.reps),
          };
        }
      }
      const firstNotDone = allSteps.findIndex((step) => !doneState[step.key]);
      const startIndex = firstNotDone === -1 ? Math.max(0, allSteps.length - 1) : firstNotDone;
      const prefill = prefillFor(allSteps, doneState, startIndex);
      setDay(loaded);
      setSteps(allSteps);
      setDone(doneState);
      currentRef.current = startIndex;
      setCurrent(startIndex);
      setWeight(prefill.weight);
      setReps(prefill.reps);
      setPhase(
        firstNotDone === -1
          ? 'done'
          : Object.keys(doneState).length > 0
            ? 'workout'
            : 'warmup',
      );
      setRest(null);
      setPr(null);
    },
    [dayId],
  );

  const currentStep = steps[current];
  const doneCount = Object.keys(done).length;
  const totalSets = steps.length;

  const handleDone = async () => {
    const step = stepsRef.current[currentRef.current];
    if (!step) return;
    const parsedWeight = Number.parseFloat(weightRef.current);
    const parsedReps = Number.parseInt(repsRef.current, 10);
    const weightVal = Number.isNaN(parsedWeight) ? null : parsedWeight;
    const repsVal = Number.isNaN(parsedReps) ? 0 : parsedReps;

    let isPr = false;
    if (weightVal != null) {
      const prevBest = await getExerciseBestWeight(step.exerciseId);
      isPr = prevBest == null || weightVal > prevBest;
    }
    await recordSet(step.slotId, new Date(), step.setIndex, weightVal, repsVal);

    doneRef.current = {
      ...doneRef.current,
      [step.key]: { weight: weightRef.current, reps: repsRef.current },
    };
    setDone(doneRef.current);
    hapticSuccess();

      if (isPr && weightVal != null) {
        setPr({ exerciseName: step.exerciseName, weight: weightVal });
      }

    const next = currentRef.current + 1;
    if (next >= stepsRef.current.length) {
      setRest(null);
      setPhase('done');
      return;
    }
    setRest({ endsAt: Date.now() + step.restSec * 1000, total: step.restSec });
  };

  const handleSkip = () => {
    const step = stepsRef.current[currentRef.current];
    if (!step) return;
    hapticSelection();
    advance();
  };

  const handleUndo = () => {
    const index = currentRef.current;
    if (index <= 0) return;
    const prevStep = stepsRef.current[index - 1];
    const wasDone = doneRef.current[prevStep.key];
    if (wasDone) {
      void clearSet(prevStep.slotId, new Date(), prevStep.setIndex);
      const nextDone = { ...doneRef.current };
      delete nextDone[prevStep.key];
      doneRef.current = nextDone;
      setDone(nextDone);
    }
    currentRef.current = index - 1;
    setCurrent(index - 1);
    setRest(null);
    const prefill = prefillFor(stepsRef.current, doneRef.current, index - 1);
    setWeight(prefill.weight);
    setReps(prefill.reps);
    hapticSelection();
  };

  const restRemaining = rest ? (rest.endsAt - now) / 1000 : 0;
  const nextStep = currentStep
    ? steps[current + 1] ?? null
    : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="smallBold">{day?.name ?? 'Workout'}</ThemedText>
            {phase === 'workout' ? (
              <ThemedText type="small" themeColor="textSecondary">
                Set {Math.min(doneCount + 1, totalSets)} of {totalSets}
              </ThemedText>
            ) : null}
          </View>
          {phase === 'workout' && doneCount > 0 ? (
            <Pressable onPress={handleUndo} hitSlop={8} style={styles.headerButton}>
              <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                Undo
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {phase === 'warmup' ? (
            <WarmupView onStart={() => setPhase('workout')} />
          ) : null}

          {phase === 'done' ? (
            <DoneView setCount={doneCount} onFinish={() => router.back()} />
          ) : null}

          {phase === 'workout' && currentStep ? (
            <>
              {totalSets > 0 ? (
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: theme.accent, width: `${(doneCount / totalSets) * 100}%` },
                    ]}
                  />
                </View>
              ) : null}

              {pr ? (
                <Card style={[styles.prCard, { backgroundColor: theme.success }]}>
                  <Ionicons name="trophy" size={18} color={theme.background} />
                  <ThemedText type="smallBold" style={[styles.prText, { color: theme.background }]}>
                    New PR · {pr.exerciseName} · {pr.weight} kg
                  </ThemedText>
                </Card>
              ) : null}

              {rest && restRemaining > 0 ? (
                <Card style={[styles.restCard, { backgroundColor: theme.accent }]}>
                  <View style={styles.restTop}>
                    <ThemedText type="smallBold" style={{ color: theme.background }}>
                      Rest
                    </ThemedText>
                    <ThemedText type="title" style={[styles.restTime, { color: theme.background }]}>
                      {formatTime(restRemaining)}
                    </ThemedText>
                  </View>
                  <View style={[styles.restBar, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                    <View
                      style={[
                        styles.restFill,
                        {
                          backgroundColor: theme.background,
                          width: `${Math.min(100, Math.max(0, (restRemaining / rest.total) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText type="small" style={{ color: theme.background }}>
                    Next: {nextStep ? `${nextStep.exerciseName} · set ${nextStep.setIndex + 1}` : 'finish'}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setRest(null);
                      advance();
                    }}
                    style={({ pressed }) => [
                      styles.skipButton,
                      { backgroundColor: 'rgba(0,0,0,0.15)', opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.background }}>
                      Skip rest & next set
                    </ThemedText>
                  </Pressable>
                </Card>
              ) : (
                <Card style={styles.exerciseCard}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.exerciseEyebrow}>
                    {currentStep.muscleGroup ?? 'Exercise'}
                  </ThemedText>
                  <ThemedText type="title" style={styles.exerciseName}>
                    {currentStep.exerciseName}
                  </ThemedText>

                  <View style={styles.setChips}>
                    {Array.from({ length: currentStep.exerciseSets }, (_, i) => {
                      const chipKey = `${currentStep.slotId}:${i}`;
                      const isDone = Boolean(done[chipKey]);
                      const isCurrent = i === currentStep.setIndex;
                      return (
                        <View
                          key={chipKey}
                          style={[
                            styles.setChip,
                            {
                              backgroundColor: isDone
                                ? theme.success
                                : isCurrent
                                  ? theme.accent
                                  : theme.backgroundSelected,
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isDone || isCurrent ? theme.background : theme.text,
                            }}>
                            {i + 1}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Set {currentStep.setIndex + 1} of {currentStep.exerciseSets}
                  </ThemedText>

                  <View style={styles.inputs}>
                    <View style={styles.inputField}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Weight (kg)
                      </ThemedText>
                      <TextInput
                        value={weight}
                        onChangeText={setWeight}
                        keyboardType="decimal-pad"
                        placeholder={currentStep.targetWeight || '0'}
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.input,
                          { backgroundColor: theme.backgroundSelected, color: theme.text },
                        ]}
                      />
                    </View>
                    <View style={styles.inputField}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Reps
                      </ThemedText>
                      <TextInput
                        value={reps}
                        onChangeText={setReps}
                        keyboardType="number-pad"
                        placeholder={currentStep.targetReps}
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.input,
                          { backgroundColor: theme.backgroundSelected, color: theme.text },
                        ]}
                      />
                    </View>
                  </View>

                  <PrimaryButton label="Set done" onPress={() => void handleDone()} />
                  <GhostButton label="Skip this set" onPress={handleSkip} />
                </Card>
              )}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function WarmupView({ onStart }: { onStart: () => void }) {
  const theme = useTheme();
  return (
    <Card style={styles.warmupCard}>
      <View style={styles.warmupIcon}>
        <Ionicons name="flame" size={28} color={theme.accent} />
      </View>
      <ThemedText type="title" style={styles.warmupTitle}>
        Warm-up first
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.warmupBody}>
        5–10 minutes of light cardio and joint mobility. Do a few light sets of the first
        exercise with the bar to feel it out before the working sets.
      </ThemedText>
      <PrimaryButton label="I'm warmed up" onPress={onStart} />
      <GhostButton label="Skip warm-up" onPress={onStart} />
    </Card>
  );
}

function DoneView({ setCount, onFinish }: { setCount: number; onFinish: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.doneView}>
      <View style={[styles.doneIcon, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark" size={40} color={theme.background} />
      </View>
      <ThemedText type="title" style={styles.doneTitle}>
        Session complete
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {setCount} set{setCount === 1 ? '' : 's'} logged. Nice work.
      </ThemedText>
      <PrimaryButton label="Finish" onPress={onFinish} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  prText: {
    flex: 1,
  },
  restCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  restTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  restTime: {
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  restBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  restFill: {
    height: '100%',
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  exerciseCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  exerciseEyebrow: {
    textTransform: 'uppercase',
  },
  exerciseName: {
    fontSize: 26,
    lineHeight: 32,
  },
  setChips: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  setChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputs: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  inputField: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 24,
    textAlign: 'center',
  },
  warmupCard: {
    padding: Spacing.four,
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  warmupIcon: {
    alignSelf: 'flex-start',
  },
  warmupTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
  warmupBody: {
    lineHeight: 20,
  },
  doneView: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 26,
    lineHeight: 32,
  },
});
