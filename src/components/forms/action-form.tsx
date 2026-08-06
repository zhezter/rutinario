import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PillGroup } from '@/components/ui/pill-group';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ActionInput } from '@/domain/crud/actions';
import type { AnchorType, FrequencyType, ScheduleType, ViabilityLevel } from '@/db/schema';

const SCHEDULE_LABELS: Record<ScheduleType, string> = {
  fixed: 'Fixed',
  anchored: 'Anchored',
  flexible: 'Flexible',
};

const ANCHOR_LABELS: Record<AnchorType, string> = {
  after: 'After',
  before: 'Before',
};

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  daily: 'Daily',
  n_per_day: '×/day',
  n_per_week: '×/week',
  every_n_days: 'Every N days',
  every_2_weeks: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  as_needed: 'As needed',
};

const LEVEL_LABELS: Record<ViabilityLevel, string> = {
  essential: 'Essential',
  standard: 'Standard',
  full: 'Optional',
};

const VALUE_FREQUENCIES: FrequencyType[] = ['n_per_day', 'n_per_week', 'every_n_days'];

export function ActionFormSheet({
  title,
  initial,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: Partial<ActionInput>;
  onSubmit: (input: ActionInput) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [durationMin, setDurationMin] = useState(
    initial?.durationMin != null ? String(initial.durationMin) : '',
  );
  const [product, setProduct] = useState(initial?.product ?? '');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initial?.scheduleType ?? 'flexible',
  );
  const [fixedTime, setFixedTime] = useState(initial?.fixedTime ?? '');
  const [anchorType, setAnchorType] = useState<AnchorType>(initial?.anchorType ?? 'after');
  const [anchorTarget, setAnchorTarget] = useState(initial?.anchorTarget ?? '');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>(
    initial?.frequencyType ?? 'daily',
  );
  const [frequencyValue, setFrequencyValue] = useState(
    initial?.frequencyValue != null ? String(initial.frequencyValue) : '',
  );
  const [minViableLevel, setMinViableLevel] = useState<ViabilityLevel>(
    initial?.minViableLevel ?? 'essential',
  );

  const needsValue = VALUE_FREQUENCIES.includes(frequencyType);

  const submit = async () => {
    if (!name.trim()) return;
    await onSubmit({
      name,
      description: description || null,
      durationMin: parsePositiveInt(durationMin),
      scheduleType,
      fixedTime: fixedTime || null,
      anchorType,
      anchorTarget: anchorTarget || null,
      frequencyType,
      frequencyValue: needsValue ? parsePositiveInt(frequencyValue) : null,
      minViableLevel,
      product: product || null,
      instructions: instructions || null,
    });
    onClose();
  };

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton label="Save step" onPress={submit} disabled={!name.trim()} />
      }>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Apply cleanser" autoFocus />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />
      <Field
        label="Duration (minutes)"
        value={durationMin}
        onChangeText={setDurationMin}
        placeholder="Optional"
        keyboardType="number-pad"
      />
      <Field label="Product / tool" value={product} onChangeText={setProduct} placeholder="Optional" />
      <Field
        label="Instructions"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Optional"
        multiline
      />

      <FormBlock label="When">
        <PillGroup
          options={['fixed', 'anchored', 'flexible'] as const}
          value={scheduleType}
          onChange={setScheduleType}
          labels={SCHEDULE_LABELS}
        />
        {scheduleType === 'fixed' ? (
          <Field
            label="Time"
            value={fixedTime}
            onChangeText={setFixedTime}
            placeholder="23:30"
          />
        ) : null}
        {scheduleType === 'anchored' ? (
          <View style={styles.stack}>
            <PillGroup
              options={['after', 'before'] as const}
              value={anchorType}
              onChange={setAnchorType}
              labels={ANCHOR_LABELS}
            />
            <Field
              label="What"
              value={anchorTarget}
              onChangeText={setAnchorTarget}
              placeholder="shower, training, sleep…"
            />
          </View>
        ) : null}
      </FormBlock>

      <FormBlock label="How often">
        <PillGroup
          options={[
            'daily',
            'n_per_day',
            'n_per_week',
            'every_n_days',
            'every_2_weeks',
            'monthly',
            'quarterly',
            'yearly',
            'as_needed',
          ] as const}
          value={frequencyType}
          onChange={setFrequencyType}
          labels={FREQUENCY_LABELS}
        />
        {needsValue ? (
          <Field
            label="Times"
            value={frequencyValue}
            onChangeText={setFrequencyValue}
            placeholder={frequencyType === 'n_per_day' ? 'e.g. 2' : frequencyType === 'n_per_week' ? 'e.g. 2' : 'e.g. 3'}
            keyboardType="number-pad"
          />
        ) : null}
      </FormBlock>

      <FormBlock label="Appears in">
        <PillGroup
          options={['essential', 'standard', 'full'] as const}
          value={minViableLevel}
          onChange={setMinViableLevel}
          labels={LEVEL_LABELS}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Essential shows in Minimal, Standard and Full. Optional only shows in Full.
        </ThemedText>
      </FormBlock>
    </Sheet>
  );
}

function FormBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.two,
  },
  block: {
    gap: Spacing.two,
  },
});
