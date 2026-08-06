import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import {
  applyWorkoutTemplate,
  workoutTemplates,
  type WorkoutTemplate,
} from '@/domain/workouts/templates';
import { hapticSuccess } from '@/lib/haptics';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WorkoutTemplatesSheet({
  visible,
  onClose,
  onApplied,
}: {
  visible: boolean;
  onClose: () => void;
  onApplied: (workoutId: number) => void;
}) {
  const theme = useTheme();
  const [busyId, setBusyId] = useState<string | null>(null);

  const apply = async (template: WorkoutTemplate) => {
    if (busyId) return;
    setBusyId(template.id);
    const workoutId = await applyWorkoutTemplate(template);
    setBusyId(null);
    hapticSuccess();
    onApplied(workoutId);
  };

  return (
    <Sheet visible={visible} title="Workout templates" onClose={onClose}>
      <ThemedText type="small" themeColor="textSecondary">
        Pick a starting point and adjust it to fit you. Exercises reuse your existing library.
      </ThemedText>
      {workoutTemplates.map((template) => {
        const chips = template.days.map((day) =>
          day.weekday != null && day.weekday >= 0 && day.weekday <= 6
            ? WEEKDAY_SHORT[day.weekday]
            : day.name,
        );
        return (
          <Pressable
            key={template.id}
            onPress={() => void apply(template)}
            disabled={busyId !== null}>
            {({ pressed }) => (
              <Card style={[styles.templateCard, pressed && { opacity: 0.7 }]}>
                <View style={styles.templateHeader}>
                  <View style={styles.templateText}>
                    <ThemedText type="smallBold">{template.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {template.description}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.useButton,
                      { backgroundColor: theme.accent },
                    ]}>
                    <Ionicons
                      name={busyId === template.id ? 'hourglass-outline' : 'add'}
                      size={18}
                      color={theme.background}
                    />
                    <ThemedText type="smallBold" style={{ color: theme.background }}>
                      Use
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.chips}>
                  {chips.map((chip, index) => (
                    <View
                      key={`${template.id}-${index}`}
                      style={[styles.chip, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small">{chip}</ThemedText>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  templateCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  templateText: {
    flex: 1,
    gap: Spacing.half,
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
});
