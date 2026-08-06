import { Pressable, StyleSheet, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ActiveLevel } from '@/domain/dashboard/types';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

const OPTIONS: { level: ActiveLevel; label: string; description: string }[] = [
  {
    level: 'minimum',
    label: 'Minimal',
    description: 'Just the essentials — the bare minimum to keep the day moving.',
  },
  {
    level: 'standard',
    label: 'Standard',
    description: 'A normal day — most of the routine, without overdoing it.',
  },
  {
    level: 'full',
    label: 'Full',
    description: 'The whole plan — every step, every block.',
  },
];

export function EnergyCheckIn({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (level: ActiveLevel) => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Sheet visible={visible} title="How's your energy today?" onClose={onClose}>
      <ThemedText type="small" themeColor="textSecondary">
        Pick the intensity for today. You can change it anytime.
      </ThemedText>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.level}
          onPress={() => {
            hapticSelection();
            onSelect(option.level);
          }}
          style={({ pressed }) => [
            styles.option,
            { backgroundColor: theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <View style={styles.optionText}>
            <ThemedText type="smallBold">{option.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {option.description}
            </ThemedText>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
});
