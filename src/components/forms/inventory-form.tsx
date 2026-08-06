import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { InventoryInput } from '@/domain/crud/inventory';
import { useTheme } from '@/hooks/use-theme';

export function InventoryFormSheet({
  title,
  initial,
  actionOptions,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: Partial<InventoryInput> & { usedInActionId?: number | null };
  actionOptions: { id: number; label: string }[];
  onSubmit: (input: InventoryInput) => void | Promise<void>;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [amount, setAmount] = useState(
    initial?.amountRemaining != null ? String(initial.amountRemaining) : '',
  );
  const [interval, setInterval] = useState(
    initial?.replacementIntervalDays != null
      ? String(initial.replacementIntervalDays)
      : '',
  );
  const [usedInActionId, setUsedInActionId] = useState<number | null>(
    initial?.usedInActionId ?? null,
  );

  const submit = async () => {
    if (!name.trim() || !category.trim()) return;
    await onSubmit({
      name,
      category,
      amountRemaining: parseClampedInt(amount),
      replacementIntervalDays: parsePositiveInt(interval),
      usedInActionId,
    });
    onClose();
  };

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton
          label="Save"
          onPress={submit}
          disabled={!name.trim() || !category.trim()}
        />
      }>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Sunscreen" autoFocus />
      <Field label="Category" value={category} onChangeText={setCategory} placeholder="e.g. Face" />
      <Field
        label="Remaining (%)"
        value={amount}
        onChangeText={setAmount}
        placeholder="e.g. 70"
        keyboardType="number-pad"
      />
      <Field
        label="Replacement interval (days)"
        value={interval}
        onChangeText={setInterval}
        placeholder="Optional, e.g. 30"
        keyboardType="number-pad"
      />

      <View style={styles.block}>
        <ThemedText type="smallBold">Used in</ThemedText>
        <Pressable
          onPress={() => setUsedInActionId(null)}
          style={({ pressed }) => [
            styles.option,
            { backgroundColor: usedInActionId == null ? theme.accent : theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}>
          <ThemedText
            type="smallBold"
            style={{ color: usedInActionId == null ? theme.background : theme.text }}>
            None
          </ThemedText>
        </Pressable>
        {actionOptions.map((option) => {
          const selected = option.id === usedInActionId;
          return (
            <Pressable
              key={option.id}
              onPress={() => setUsedInActionId(option.id)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: selected ? theme.accent : theme.backgroundSelected },
                pressed && { opacity: 0.7 },
              ]}>
              <ThemedText
                type="small"
                style={{ color: selected ? theme.background : theme.text }}>
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

function parseClampedInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.max(0, Math.min(100, parsed));
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  option: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
