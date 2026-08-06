import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import type { WorkoutExerciseInput } from '@/domain/workouts/types';

function toInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toNum(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function WorkoutExerciseFormSheet({
  visible,
  title,
  initial,
  submitLabel,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial?: Partial<WorkoutExerciseInput> & { exerciseName?: string };
  submitLabel: string;
  onSubmit: (input: WorkoutExerciseInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.exerciseName ?? '');
  const [muscleGroup, setMuscleGroup] = useState(initial?.muscleGroup ?? '');
  const [sets, setSets] = useState(String(initial?.sets ?? 3));
  const [reps, setReps] = useState(initial?.reps ?? '10');
  const [rest, setRest] = useState(initial?.restSec != null ? String(initial.restSec) : '');
  const [weight, setWeight] = useState(initial?.weightKg != null ? String(initial.weightKg) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      exerciseName: name.trim(),
      muscleGroup: muscleGroup.trim() || undefined,
      sets: Math.max(1, toInt(sets) ?? 3),
      reps: reps.trim() || '10',
      restSec: toInt(rest),
      weightKg: toNum(weight),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Field
        label="Exercise"
        placeholder="Bench Press"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <Field
        label="Muscle group (optional)"
        placeholder="Chest"
        value={muscleGroup}
        onChangeText={setMuscleGroup}
        autoCapitalize="words"
      />
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Field
            label="Sets"
            value={sets}
            onChangeText={setSets}
            keyboardType="number-pad"
            style={styles.numInput}
          />
        </View>
        <View style={styles.rowItem}>
          <Field
            label="Reps"
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            style={styles.numInput}
            placeholder="10"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Field
            label="Rest (sec)"
            value={rest}
            onChangeText={setRest}
            keyboardType="number-pad"
            style={styles.numInput}
            placeholder="90"
          />
        </View>
        <View style={styles.rowItem}>
          <Field
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            style={styles.numInput}
            placeholder="—"
          />
        </View>
      </View>
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      <ThemedText type="small" themeColor="textSecondary">
        Sets are recorded per exercise. Weight and reps are saved when you check a set.
      </ThemedText>
      <PrimaryButton label={submitLabel} onPress={handleSubmit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
  },
  numInput: {
    textAlign: 'center',
  },
});
