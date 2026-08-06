import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PillGroup } from '@/components/ui/pill-group';
import { Sheet } from '@/components/ui/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type RoutineFormResult = {
  name: string;
  description?: string;
  systemId: number | null;
  domainId: number | null;
  newSystemName: string | null;
};

const NEW_SYSTEM = '__new__';

export function RoutineFormSheet({
  title,
  mode,
  domains,
  systems,
  initial,
  defaultSystemId,
  onSubmit,
  onClose,
}: {
  title: string;
  mode: 'new' | 'edit';
  domains: { id: number; name: string }[];
  systems: { id: number; name: string; domainId: number }[];
  initial?: { name: string; description?: string };
  defaultSystemId?: number;
  onSubmit: (result: RoutineFormResult) => void | Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  const defaultSystem = systems.find((s) => s.id === defaultSystemId);
  const [domainId, setDomainId] = useState<number | null>(
    defaultSystem?.domainId ?? domains[0]?.id ?? null,
  );
  const [systemSel, setSystemSel] = useState<string | null>(
    defaultSystemId != null ? String(defaultSystemId) : null,
  );
  const [newSystemName, setNewSystemName] = useState('');

  const domainSystems = systems.filter((s) => s.domainId === domainId);
  const systemLabels = Object.fromEntries(
    domainSystems.map((s) => [String(s.id), s.name]),
  ) as Record<string, string>;

  const systemOptions = [...domainSystems.map((s) => String(s.id)), NEW_SYSTEM];

  const newSystemMode = systemSel === NEW_SYSTEM;
  const canSubmit = Boolean(name.trim()) && (mode === 'edit' || Boolean(systemSel)) &&
    (!newSystemMode || Boolean(newSystemName.trim()));

  const submit = async () => {
    if (!name.trim()) return;
    await onSubmit({
      name,
      description: description || undefined,
      systemId: systemSel && systemSel !== NEW_SYSTEM ? Number(systemSel) : null,
      domainId,
      newSystemName: newSystemMode ? newSystemName.trim() || null : null,
    });
    onClose();
  };

  return (
    <Sheet
      visible
      title={title}
      onClose={onClose}
      footer={
        <PrimaryButton label="Save" onPress={submit} disabled={!canSubmit} />
      }>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Morning Care" autoFocus />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />

      {mode === 'new' ? (
        <>
          <View style={styles.block}>
            <ThemedText type="smallBold">Domain</ThemedText>
            {domains.length > 0 ? (
              <PillGroup
                options={domains.map((d) => String(d.id))}
                value={domainId != null ? String(domainId) : ''}
                onChange={(v) => {
                  setDomainId(Number(v));
                  setSystemSel(null);
                }}
                labels={Object.fromEntries(domains.map((d) => [String(d.id), d.name]))}
              />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Create a domain first.
              </ThemedText>
            )}
          </View>

          {domains.length > 0 ? (
            <View style={styles.block}>
              <ThemedText type="smallBold">System</ThemedText>
              <PillGroup
                options={systemOptions}
                value={systemSel ?? ''}
                onChange={setSystemSel}
                labels={{ ...systemLabels, [NEW_SYSTEM]: '+ New system…' }}
              />
              {newSystemMode ? (
                <Field
                  label="New system name"
                  value={newSystemName}
                  onChangeText={setNewSystemName}
                  placeholder="e.g. Skin"
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
});
