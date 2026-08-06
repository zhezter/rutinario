import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { weekdayLabel, weekdayOptions } from '@/domain/workouts/schedule';
import { useTheme } from '@/hooks/use-theme';

export type WorkoutDayFormResult = {
  name: string;
  weekday: number | null;
};

export function WorkoutDayFormSheet({
  visible,
  title,
  initial,
  submitLabel,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  initial?: { name: string; weekday: number | null };
  submitLabel: string;
  onSubmit: (result: WorkoutDayFormResult) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [weekday, setWeekday] = useState<number | null>(initial?.weekday ?? null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), weekday });
  };

  return (
    <Sheet visible={visible} title={title} onClose={onClose}>
      <Field
        label="Day name"
        placeholder="Push · Chest & Shoulders"
        value={name}
        onChangeText={setName}
        autoFocus
      />
      <View style={styles.section}>
        <ThemedText type="small" themeColor="textSecondary">
          Repeat on
        </ThemedText>
        <View style={styles.chips}>
          <Pressable
            onPress={() => setWeekday(null)}
            style={[
              styles.chip,
              {
                backgroundColor: weekday === null ? theme.accent : theme.backgroundSelected,
              },
            ]}>
            <ThemedText
              type="small"
              style={{ color: weekday === null ? theme.background : theme.text }}>
              Any day
            </ThemedText>
          </Pressable>
          {weekdayOptions().map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setWeekday(option.value)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    weekday === option.value ? theme.accent : theme.backgroundSelected,
                },
              ]}>
              <ThemedText
                type="small"
                style={{
                  color: weekday === option.value ? theme.background : theme.text,
                }}>
                {weekdayLabel(option.value)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
      <PrimaryButton label={submitLabel} onPress={handleSubmit} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
});
