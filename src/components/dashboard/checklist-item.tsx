import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { DailyPlanItem } from '@/domain/dashboard/types';
import { useTheme } from '@/hooks/use-theme';

type ChecklistItemProps = {
  item: DailyPlanItem;
  onToggle: (item: DailyPlanItem) => void;
};

export function ChecklistItem({ item, onToggle }: ChecklistItemProps) {
  const theme = useTheme();

  const meta: string[] = [];
  if (item.fixedTime) meta.push(item.fixedTime);
  if (item.anchor) meta.push(item.anchor);
  if (item.frequency !== 'Daily') meta.push(item.frequency);

  return (
    <Pressable
      onPress={() => onToggle(item)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: item.completed ? theme.success : theme.textSecondary,
            backgroundColor: item.completed ? theme.success : 'transparent',
          },
        ]}>
        {item.completed && <ThemedText style={styles.checkmark} themeColor="background">✓</ThemedText>}
      </View>

      <View style={styles.body}>
        <ThemedText
          type="smallBold"
          style={[item.completed && { textDecorationLine: 'line-through', color: theme.textSecondary }]}>
          {item.name}
        </ThemedText>
        {meta.length > 0 && (
          <ThemedText type="small" style={[styles.meta, { color: theme.textSecondary }]}>
            {meta.join(' · ')}
          </ThemedText>
        )}
        {item.product ? (
          <ThemedText type="small" style={[styles.meta, { color: theme.textSecondary }]}>
            {item.product}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: 700,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  meta: {
    fontSize: 12,
  },
});
