import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  completed: number;
  total: number;
  color?: string;
};

export function ProgressBar({ completed, total, color }: ProgressBarProps) {
  const theme = useTheme();
  const ratio = total === 0 ? 0 : completed / total;
  const width: DimensionValue = `${Math.min(100, ratio * 100)}%`;

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          { width, backgroundColor: color ?? theme.accent },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: Spacing.two,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Spacing.two,
  },
});
