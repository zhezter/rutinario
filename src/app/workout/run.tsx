import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { getWorkoutDay } from '@/domain/workouts/workouts';
import {
  clearSet,
  getDayLogs,
  recordSet,
} from '@/domain/workouts/runner';
import type { WorkoutDaySummary, WorkoutExerciseSummary } from '@/domain/workouts/types';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

type SetDraft = {
  weight: string;
  reps: string;
  done: boolean;
};

type SlotState = {
  slot: WorkoutExerciseSummary;
  sets: SetDraft[];
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

export default function WorkoutRunScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const dayId = Number(params.dayId);
  const theme = useTheme();
  const [day, setDay] = useState<WorkoutDaySummary | null>(null);
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!rest) return;
    if (now >= rest.endsAt) {
      setRest(null);
      hapticSuccess();
    }
  }, [now, rest]);

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
      const nextSlots: SlotState[] = loaded.exercises.map((slot) => {
        const logged = logs.get(slot.id) ?? [];
        return {
          slot,
          sets: Array.from({ length: slot.sets }, (_, setIndex) => {
            const entry = logged.find((item) => item.setIndex === setIndex);
            return {
              weight: entry?.weightKg != null ? String(entry.weightKg) : slot.weightKg != null ? String(slot.weightKg) : '',
              reps: entry?.reps != null ? String(entry.reps) : slot.reps,
              done: entry != null,
            };
          }),
        };
      });
      setDay(loaded);
      setSlots(nextSlots);
    },
    [dayId],
  );

  const allDone = useMemo(
    () => slots.length > 0 && slots.every((slot) => slot.sets.every((set) => set.done)),
    [slots],
  );

  const totalSets = slots.reduce((acc, slot) => acc + slot.sets.length, 0);
  const doneSets = slots.reduce(
    (acc, slot) => acc + slot.sets.filter((set) => set.done).length,
    0,
  );

  const remainingAfter = (slotIndex: number, setIndex: number): number => {
    let remaining = 0;
    for (let i = slotIndex; i < slotsRef.current.length; i++) {
      const slot = slotsRef.current[i];
      for (let j = i === slotIndex ? setIndex + 1 : 0; j < slot.sets.length; j++) {
        if (!slot.sets[j].done) remaining++;
      }
    }
    return remaining;
  };

  const startRest = (seconds: number) => {
    if (seconds <= 0) return;
    setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
  };

  const toggleSet = (slotIndex: number, setIndex: number) => {
    const current = slotsRef.current[slotIndex].sets[setIndex];
    if (current.done) {
      const next = slotsRef.current.map((slot) => ({ ...slot, sets: [...slot.sets] }));
      next[slotIndex].sets[setIndex] = { ...current, done: false };
      setSlots(next);
      void clearSet(slotsRef.current[slotIndex].slot.id, new Date(), setIndex);
      hapticSelection();
      return;
    }

    const weight = Number.parseFloat(current.weight);
    const reps = Number.parseInt(current.reps, 10);
    const next = slotsRef.current.map((slot) => ({ ...slot, sets: [...slot.sets] }));
    next[slotIndex].sets[setIndex] = { ...current, done: true };
    setSlots(next);
    void recordSet(
      slotsRef.current[slotIndex].slot.id,
      new Date(),
      setIndex,
      Number.isNaN(weight) ? null : weight,
      Number.isNaN(reps) ? 0 : reps,
    );
    hapticSuccess();

    const slot = slotsRef.current[slotIndex];
    const restSec = slot.slot.restSec ?? day?.restSec ?? 90;
    if (remainingAfter(slotIndex, setIndex) > 0) startRest(restSec);
  };

  const updateSet = (slotIndex: number, setIndex: number, field: 'weight' | 'reps', value: string) => {
    const current = slotsRef.current[slotIndex].sets[setIndex];
    const next = slotsRef.current.map((slot) => ({ ...slot, sets: [...slot.sets] }));
    next[slotIndex].sets[setIndex] = { ...current, [field]: value };
    setSlots(next);
    if (current.done) {
      const weight = Number.parseFloat(
        field === 'weight' ? value : next[slotIndex].sets[setIndex].weight,
      );
      const reps = Number.parseInt(
        field === 'reps' ? value : next[slotIndex].sets[setIndex].reps,
        10,
      );
      void recordSet(
        slotsRef.current[slotIndex].slot.id,
        new Date(),
        setIndex,
        Number.isNaN(weight) ? null : weight,
        Number.isNaN(reps) ? 0 : reps,
      );
    }
  };

  const restRemaining = rest ? (rest.endsAt - now) / 1000 : 0;

  const finish = () => {
    Alert.alert(
      'Session complete',
      'All sets done. Nice work, see you next session.',
      [{ text: 'Done', onPress: () => router.back() }],
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              {day?.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {doneSets} / {totalSets} sets
            </ThemedText>
          </View>
        </View>

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
            <Pressable
              onPress={() => setRest(null)}
              style={({ pressed }) => [
                styles.skipButton,
                { backgroundColor: 'rgba(0,0,0,0.15)', opacity: pressed ? 0.7 : 1 },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                Skip rest
              </ThemedText>
            </Pressable>
          </Card>
        ) : null}

        {slots.map((slotState, slotIndex) => (
          <Card key={slotState.slot.id} style={styles.exerciseCard}>
            <ThemedText type="smallBold">{slotState.slot.exercise.name}</ThemedText>
            {slotState.slot.exercise.muscleGroup ? (
              <ThemedText type="small" themeColor="textSecondary">
                {slotState.slot.exercise.muscleGroup}
              </ThemedText>
            ) : null}
            <View style={styles.sets}>
              <View style={[styles.setHeaderRow]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.setNumHeader}>
                  Set
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.inputHeader}>
                  kg
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.inputHeader}>
                  reps
                </ThemedText>
              </View>
              {slotState.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.setRow}>
                  <Pressable
                    onPress={() => toggleSet(slotIndex, setIndex)}
                    hitSlop={8}
                    style={styles.checkbox}>
                    <Ionicons
                      name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={set.done ? theme.accent : theme.textSecondary}
                    />
                    <ThemedText type="small" themeColor="textSecondary">
                      {setIndex + 1}
                    </ThemedText>
                  </Pressable>
                  <TextInput
                    value={set.weight}
                    onChangeText={(value) => updateSet(slotIndex, setIndex, 'weight', value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      { backgroundColor: theme.backgroundSelected, color: theme.text },
                    ]}
                  />
                  <TextInput
                    value={set.reps}
                    onChangeText={(value) => updateSet(slotIndex, setIndex, 'reps', value)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      { backgroundColor: theme.backgroundSelected, color: theme.text },
                    ]}
                  />
                </View>
              ))}
            </View>
          </Card>
        ))}

        {slots.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            This day has no exercises yet.
          </ThemedText>
        ) : null}

        {allDone ? (
          <Pressable
            onPress={finish}
            style={({ pressed }) => [
              styles.finishButton,
              { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Finish session
            </ThemedText>
          </Pressable>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
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
  sets: {
    gap: Spacing.one,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  setNumHeader: {
    width: 56,
  },
  inputHeader: {
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  checkbox: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
  },
  finishButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.one,
  },
});
