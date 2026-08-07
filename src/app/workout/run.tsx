import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { Spacing } from '@/constants/theme';
import { getWorkoutDay } from '@/domain/workouts/workouts';
import {
  clearSet,
  getBestWeights,
  getDayLogs,
  getDaySessionCount,
  getExerciseBestWeight,
  recordSet,
  suggestWeight,
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
  incrementKg: number | null;
  cycleWeeks: number | null;
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

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

function buildSteps(
  day: WorkoutDaySummary,
  sessionCount: number,
  bestWeights: Map<number, number>,
): WorkoutStep[] {
  const steps: WorkoutStep[] = [];
  for (const slot of day.exercises) {
    const suggested = suggestWeight({
      weightKg: slot.weightKg,
      incrementKg: slot.incrementKg,
      sessionCount,
      cycleWeeks: day.cycleWeeks,
      bestWeightKg: bestWeights.get(slot.exercise.id) ?? null,
    });
    const targetWeight =
      suggested != null
        ? String(suggested)
        : slot.weightKg != null
          ? String(slot.weightKg)
          : '';
    for (let setIndex = 0; setIndex < slot.sets; setIndex++) {
      steps.push({
        key: `${slot.id}:${setIndex}`,
        slotId: slot.id,
        exerciseId: slot.exercise.id,
        exerciseName: slot.exercise.name,
        muscleGroup: slot.exercise.muscleGroup,
        setIndex,
        exerciseSets: slot.sets,
        targetWeight,
        targetReps: slot.reps,
        restSec: slot.restSec ?? day.restSec ?? 90,
        incrementKg: slot.incrementKg,
        cycleWeeks: day.cycleWeeks,
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

function volumeOf(steps: WorkoutStep[], done: Record<string, LoggedInfo>): number {
  return steps.reduce((acc, step) => {
    const entry = done[step.key];
    if (!entry) return acc;
    const w = Number.parseFloat(entry.weight);
    const r = Number.parseInt(entry.reps, 10);
    if (Number.isNaN(w) || Number.isNaN(r)) return acc;
    return acc + w * r;
  }, 0);
}

function RestCountdown({ seconds }: { seconds: number }) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const prevSec = useRef<number | null>(null);
  const currentSec = Math.ceil(seconds);

  useEffect(() => {
    if (prevSec.current !== null && currentSec !== prevSec.current) {
      scale.setValue(1.18);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 5,
      }).start();
    }
    prevSec.current = currentSec;
  }, [currentSec, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <ThemedText style={[styles.restCountdown, { color: theme.background }]}>
        {formatTime(seconds)}
      </ThemedText>
    </Animated.View>
  );
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
  const [sessionCount, setSessionCount] = useState(0);
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
  const sessionStartRef = useRef(Date.now());

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
    ['workout_days', 'workout_exercises', 'exercises'],
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
      const sessionCountValue = await getDaySessionCount(
        loaded.exercises.map((slot) => slot.id),
      );
      const bestWeights = await getBestWeights(loaded.exercises.map((slot) => slot.exercise.id));
      const allSteps = buildSteps(loaded, sessionCountValue, bestWeights);
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
      setSessionCount(sessionCountValue);
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
  const nextStep = currentStep ? (steps[current + 1] ?? null) : null;
  const progressPct = totalSets > 0 ? (doneCount / totalSets) * 100 : 0;

  const startWorkout = () => {
    sessionStartRef.current = Date.now();
    setPhase('workout');
  };

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
                {doneCount} of {totalSets} sets
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

        {phase === 'workout' && totalSets > 0 ? (
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.accent, width: `${progressPct}%` },
              ]}
            />
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {phase === 'warmup' ? <WarmupView onStart={startWorkout} /> : null}

          {phase === 'done' ? (
            <DoneView
              steps={steps}
              done={done}
              elapsedMs={Date.now() - sessionStartRef.current}
              onFinish={() => router.back()}
            />
          ) : null}

          {phase === 'workout' && currentStep ? (
            rest && restRemaining > 0 ? (
              <RestView
                seconds={restRemaining}
                total={rest.total}
                nextStep={nextStep}
                onSkip={() => {
                  setRest(null);
                  advance();
                }}
              />
            ) : (
              <>
                {pr ? <PrBanner pr={pr} /> : null}

                <Card style={styles.exerciseCard}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
                    {currentStep.muscleGroup ?? 'Exercise'}
                  </ThemedText>
                  <ThemedText type="title" style={styles.exerciseName}>
                    {currentStep.exerciseName}
                  </ThemedText>

                  {currentStep.targetWeight ? (
                    <View style={styles.progressionRow}>
                      <Ionicons
                        name="trending-up"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        {sessionCount > 0
                          ? `Session ${sessionCount + 1}${currentStep.cycleWeeks ? ` of ${currentStep.cycleWeeks}` : ''} · suggested ${currentStep.targetWeight} kg (+${currentStep.incrementKg ?? 2.5}/session)`
                          : currentStep.incrementKg != null
                            ? `Starting ${currentStep.targetWeight} kg · +${currentStep.incrementKg}/session`
                            : `Starting ${currentStep.targetWeight} kg`}
                      </ThemedText>
                    </View>
                  ) : null}

                  <View style={styles.setRow}>
                    <SetDots
                      exerciseSets={currentStep.exerciseSets}
                      currentSet={currentStep.setIndex}
                      slotId={currentStep.slotId}
                      done={done}
                    />
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Set {currentStep.setIndex + 1}/{currentStep.exerciseSets}
                    </ThemedText>
                  </View>

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

                  <Pressable
                    onPress={() => void handleDone()}
                    style={({ pressed }) => [
                      styles.doneButton,
                      { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
                    ]}>
                    <ThemedText type="smallBold" style={[styles.doneLabel, { color: theme.background }]}>
                      Done
                    </ThemedText>
                  </Pressable>

                  <View style={styles.secondaryRow}>
                    <Pressable onPress={handleSkip} hitSlop={8}>
                      <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
                        Skip set
                      </ThemedText>
                    </Pressable>
                    {nextStep ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Next up: {nextStep.exerciseName} · set {nextStep.setIndex + 1}
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        Last set of the session
                      </ThemedText>
                    )}
                  </View>
                </Card>
              </>
            )
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SetDots({
  exerciseSets,
  currentSet,
  slotId,
  done,
}: {
  exerciseSets: number;
  currentSet: number;
  slotId: number;
  done: Record<string, LoggedInfo>;
}) {
  const theme = useTheme();
  return (
    <View style={styles.setDots}>
      {Array.from({ length: exerciseSets }, (_, i) => {
        const isDone = Boolean(done[`${slotId}:${i}`]);
        const isCurrent = i === currentSet;
        return (
          <View
            key={i}
            style={[
              styles.setDot,
              {
                backgroundColor: isDone
                  ? theme.success
                  : isCurrent
                    ? theme.accent
                    : theme.backgroundSelected,
                borderColor: isCurrent ? theme.accent : 'transparent',
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function PrBanner({ pr }: { pr: { exerciseName: string; weight: number } }) {
  const theme = useTheme();
  return (
    <View style={[styles.prBanner, { backgroundColor: theme.success }]}>
      <Ionicons name="trophy" size={18} color={theme.background} />
      <ThemedText type="smallBold" style={[styles.prText, { color: theme.background }]}>
        New PR · {pr.exerciseName} · {pr.weight} kg
      </ThemedText>
    </View>
  );
}

function RestView({
  seconds,
  total,
  nextStep,
  onSkip,
}: {
  seconds: number;
  total: number;
  nextStep: WorkoutStep | null;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const elapsedPct = Math.min(100, Math.max(0, (1 - seconds / total) * 100));

  return (
    <View style={[styles.restWrap, { backgroundColor: theme.accent }]}>
      <ThemedText type="smallBold" style={[styles.restLabel, { color: theme.background }]}>
        Rest
      </ThemedText>
      <RestCountdown seconds={seconds} />
      <View style={[styles.restBarTrack, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
        <View
          style={[
            styles.restBarFill,
            { backgroundColor: theme.background, width: `${elapsedPct}%` },
          ]}
        />
      </View>
      <View style={styles.restNext}>
        <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Next up
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          {nextStep ? `${nextStep.exerciseName} · set ${nextStep.setIndex + 1}` : 'Finish session'}
        </ThemedText>
      </View>
      <Pressable
        onPress={onSkip}
        style={({ pressed }) => [
          styles.restSkip,
          { backgroundColor: 'rgba(0,0,0,0.18)', opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold" style={{ color: theme.background }}>
          Skip rest & next set
        </ThemedText>
      </Pressable>
    </View>
  );
}

function WarmupView({ onStart }: { onStart: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.warmupView}>
      <View style={[styles.warmupIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="flame" size={30} color={theme.accent} />
      </View>
      <ThemedText type="title" style={styles.warmupTitle}>
        Warm up before lifting
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.warmupBody}>
        Get the blood moving so every working set counts.
      </ThemedText>
      <Card style={styles.warmupCard}>
        <WarmupRow icon="bicycle-outline" text="5–10 min light cardio to raise your heart rate" />
        <WarmupRow icon="body-outline" text="Joint mobility for shoulders, hips and ankles" />
        <WarmupRow icon="barbell-outline" text="A couple of easy sets on the first exercise" />
      </Card>
      <Pressable
        onPress={onStart}
        style={({ pressed }) => [
          styles.doneButton,
          { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold" style={[styles.doneLabel, { color: theme.background }]}>
          I&apos;m warmed up
        </ThemedText>
      </Pressable>
      <Pressable onPress={onStart} hitSlop={8}>
        <ThemedText type="smallBold" style={{ color: theme.textSecondary }}>
          Skip warm-up
        </ThemedText>
      </Pressable>
    </View>
  );
}

function WarmupRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.warmupRow}>
      <Ionicons name={icon} size={18} color={theme.accent} />
      <ThemedText type="small" style={styles.warmupRowText}>
        {text}
      </ThemedText>
    </View>
  );
}

function DoneView({
  steps,
  done,
  elapsedMs,
  onFinish,
}: {
  steps: WorkoutStep[];
  done: Record<string, LoggedInfo>;
  elapsedMs: number;
  onFinish: () => void;
}) {
  const theme = useTheme();
  const setCount = Object.keys(done).length;
  const volume = volumeOf(steps, done);

  return (
    <View style={styles.doneView}>
      <View style={[styles.doneIcon, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark" size={40} color={theme.background} />
      </View>
      <ThemedText type="title" style={styles.doneTitle}>
        Session complete
      </ThemedText>
      <View style={styles.doneStats}>
        <Stat label="Sets" value={String(setCount)} />
        <Stat label="Volume" value={`${Math.round(volume)} kg`} />
        <Stat label="Time" value={formatDuration(elapsedMs)} />
      </View>
      <Pressable
        onPress={onFinish}
        style={({ pressed }) => [
          styles.doneButton,
          { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold" style={[styles.doneLabel, { color: theme.background }]}>
          Finish
        </ThemedText>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
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
  progressTrack: {
    marginTop: Spacing.two,
    marginHorizontal: Spacing.three,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  exerciseCard: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  exerciseName: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  setDots: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  setDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  inputs: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  inputField: {
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 28,
    textAlign: 'center',
    fontWeight: 600,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  doneLabel: {
    fontSize: 16,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  prText: {
    flex: 1,
    fontSize: 15,
  },
  restWrap: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  restLabel: {
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  restCountdown: {
    fontSize: 72,
    lineHeight: 80,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  restBarTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  restBarFill: {
    height: '100%',
  },
  restNext: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  restSkip: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  warmupView: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  warmupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warmupTitle: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  warmupBody: {
    textAlign: 'center',
    lineHeight: 20,
  },
  warmupCard: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  warmupRowText: {
    flex: 1,
    lineHeight: 18,
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
  doneStats: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 24,
  },
});
