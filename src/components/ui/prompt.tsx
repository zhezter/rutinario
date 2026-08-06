import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Field } from '@/components/ui/field';
import { PrimaryButton, GhostButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function PromptSheet({
  visible,
  title,
  message,
  initialValue,
  placeholder,
  submitLabel,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={() => {
        setValue('');
        onClose();
      }}
      footer={
        <PrimaryButton label={submitLabel} onPress={submit} disabled={!value.trim()} />
      }>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Field
          label="Name"
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </KeyboardAvoidingView>
    </Sheet>
  );
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      title={title}
      onClose={onClose}
      footer={
        <View style={styles.confirmFooter}>
          <GhostButton label="Cancel" onPress={onClose} />
          <PrimaryButton label={confirmLabel} onPress={onConfirm} />
        </View>
      }>
      <ThemedText type="default" themeColor="textSecondary">
        {message}
      </ThemedText>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  confirmFooter: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
