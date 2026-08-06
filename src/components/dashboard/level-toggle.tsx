import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ActiveLevel } from '@/domain/dashboard/types';
import { useTheme } from '@/hooks/use-theme';

const LEVELS: ActiveLevel[] = ['minimum', 'standard', 'full'];

const LABELS: Record<ActiveLevel, string> = {
  minimum: 'Minimal',
  standard: 'Standard',
  full: 'Full',
};

export function LevelToggle({
  value,
  onChange,
}: {
  value: ActiveLevel;
  onChange: (level: ActiveLevel) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {LEVELS.map((level) => {
        const selected = level === value;
        return (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? theme.accent : theme.backgroundElement,
              },
            ]}>
            <ThemedText type="smallBold" style={styles.label} themeColor={selected ? 'background' : undefined}>
              {LABELS[level]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  label: {
    fontSize: 12,
  },
});
