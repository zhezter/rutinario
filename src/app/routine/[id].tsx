import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionFormSheet } from '@/components/forms/action-form';
import { RoutineFormSheet } from '@/components/forms/routine-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PromptSheet, ConfirmSheet } from '@/components/ui/prompt';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { createProcedure, updateProcedure, deleteProcedure, moveProcedure } from '@/domain/crud/procedures';
import { createAction, updateAction, deleteAction, moveAction, type ActionInput } from '@/domain/crud/actions';
import { updateRoutine, deleteRoutine } from '@/domain/crud/hierarchy';
import { durationLabel, summarizeRoutine } from '@/domain/routines/summary';
import { useRoutine } from '@/hooks/useRoutine';
import { useTheme } from '@/hooks/use-theme';
import { domainColor } from '@/lib/domainColor';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = useRoutine(Number(id));
  const theme = useTheme();

  const [routineMenu, setRoutineMenu] = useState(false);
  const [routineForm, setRoutineForm] = useState<{
    initial?: { name: string; description?: string };
  } | null>(null);
  const [procedureMenu, setProcedureMenu] = useState<{
    id: number;
    name: string;
    description?: string | null;
  } | null>(null);
  const [actionMenu, setActionMenu] = useState<{
    id: number;
    name: string;
    procedureId: number;
    input: Partial<ActionInput>;
  } | null>(null);
  const [actionForm, setActionForm] = useState<{
    mode: 'new' | 'edit';
    procedureId: number;
    actionId?: number;
    initial?: Partial<ActionInput>;
  } | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    initialValue?: string;
    message?: string;
    submitLabel: string;
    onSubmit: (value: string) => void;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  if (!routine) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: 'Routine' }} />
        <ThemedText type="small" themeColor="textSecondary">
          Getting things ready…
        </ThemedText>
      </ThemedView>
    );
  }

  const routineId = routine.id;
  const actions = routine.procedures.flatMap((procedure) => procedure.actions);
  const summary = summarizeRoutine(actions);
  const duration = durationLabel(summary.durationMin);

  const productsWithActions = new Map<string, string[]>();
  for (const procedure of routine.procedures) {
    for (const action of procedure.actions) {
      if (!action.product) continue;
      const list = productsWithActions.get(action.product) ?? [];
      list.push(action.name);
      productsWithActions.set(action.product, list);
    }
  }

  const headerRight = () => (
    <Pressable onPress={() => setRoutineMenu(true)} hitSlop={8}>
      <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
    </Pressable>
  );

  const procedureActions: SheetAction[] = procedureMenu
    ? [
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename step',
              initialValue: procedureMenu.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await updateProcedure(procedureMenu.id, { name });
              },
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete step?',
              message: `This deletes "${procedureMenu.name}" and its steps.`,
              onConfirm: async () => {
                await deleteProcedure(procedureMenu.id);
              },
            }),
        },
      ]
    : [];

  const actionSheetActions: SheetAction[] = actionMenu
    ? [
        {
          label: 'Edit',
          icon: 'pencil-outline',
          onPress: () =>
            setActionForm({
              mode: 'edit',
              procedureId: actionMenu.procedureId,
              actionId: actionMenu.id,
              initial: actionMenu.input,
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete step?',
              message: `This deletes "${actionMenu.name}".`,
              onConfirm: async () => {
                await deleteAction(actionMenu.id);
              },
            }),
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: routine.name, headerRight }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pathRow}>
          <View
            style={[
              styles.domainDot,
              { backgroundColor: domainColor(routine.system.domain.name) },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {routine.system.domain.name} · {routine.system.name}
          </ThemedText>
        </View>

        <ThemedText type="subtitle">{routine.name}</ThemedText>
        {routine.description ? (
          <ThemedText type="small" themeColor="textSecondary">
            {routine.description}
          </ThemedText>
        ) : null}

        <Card style={styles.metaCard}>
          <MetaRow label="Category" value={routine.system.domain.name} />
          <MetaRow label="Frequency" value={summary.frequency} />
          {duration ? <MetaRow label="Duration" value={duration} /> : null}
          {summary.triggers.length > 0 ? (
            <MetaRow label="Trigger" value={summary.triggers.join(' · ')} />
          ) : null}
          <MetaRow label="Priority" value={summary.priority} />
        </Card>

        <PrimaryButton
          label="Start routine"
          onPress={() =>
            router.push({
              pathname: '/execute/[id]',
              params: { id: String(routineId) },
            })
          }
        />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Steps</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              tap to edit · arrows to reorder
            </ThemedText>
          </View>

          {routine.procedures.map((procedure, procedureIndex) => (
            <Card key={procedure.id}>
              <View style={styles.procedureHeader}>
                <ThemedText type="smallBold" style={styles.procedureName}>
                  {procedure.name}
                </ThemedText>
                <View style={styles.reorderButtons}>
                  <ReorderArrow
                    direction="up"
                    disabled={procedureIndex === 0}
                    onPress={() => void moveProcedure(procedure.id, 'up')}
                  />
                  <ReorderArrow
                    direction="down"
                    disabled={procedureIndex === routine.procedures.length - 1}
                    onPress={() => void moveProcedure(procedure.id, 'down')}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    setProcedureMenu({
                      id: procedure.id,
                      name: procedure.name,
                      description: procedure.description,
                    })
                  }
                  hitSlop={8}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
              {procedure.description ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {procedure.description}
                </ThemedText>
              ) : null}
              {procedure.actions.map((action, actionIndex) => (
                <Pressable
                  key={action.id}
                  onPress={() =>
                    setActionForm({
                      mode: 'edit',
                      procedureId: procedure.id,
                      actionId: action.id,
                      initial: toActionInput(action),
                    })
                  }
                  onLongPress={() =>
                    setActionMenu({
                      id: action.id,
                      name: action.name,
                      procedureId: procedure.id,
                      input: toActionInput(action),
                    })
                  }
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.actionRow,
                    pressed && { opacity: 0.6 },
                  ]}>
                  <View style={styles.actionName}>
                    <ThemedText type="small">{action.name}</ThemedText>
                    {action.product ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {action.product}
                      </ThemedText>
                    ) : null}
                    {action.instructions ? (
                      <ThemedText
                        type="small"
                        style={styles.instructions}
                        themeColor="textSecondary">
                        {action.instructions}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.reorderButtons}>
                    <ReorderArrow
                      direction="up"
                      disabled={actionIndex === 0}
                      onPress={() => void moveAction(action.id, 'up')}
                    />
                    <ReorderArrow
                      direction="down"
                      disabled={actionIndex === procedure.actions.length - 1}
                      onPress={() => void moveAction(action.id, 'down')}
                    />
                  </View>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setActionForm({ mode: 'new', procedureId: procedure.id })}
                style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.6 }]}>
                <Ionicons name="add" size={18} color={theme.accent} />
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Add step
                </ThemedText>
              </Pressable>
            </Card>
          ))}

          <Pressable
            onPress={() =>
              setPrompt({
                title: 'New step group',
                submitLabel: 'Add group',
                onSubmit: async (name) => {
                  await createProcedure(routineId, name);
                },
              })
            }
            style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.6 }]}>
            <Ionicons name="add" size={18} color={theme.accent} />
            <ThemedText type="smallBold" style={{ color: theme.accent }}>
              Add group
            </ThemedText>
          </Pressable>
        </View>

        {productsWithActions.size > 0 ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">Products</ThemedText>
            <Card>
              {[...productsWithActions.entries()].map(([product, usedIn]) => (
                <View key={product} style={styles.productRow}>
                  <ThemedText type="smallBold" style={styles.productName}>
                    {product}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {usedIn.join(', ')}
                  </ThemedText>
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      <ActionSheet
        visible={routineMenu}
        title={routine.name}
        onClose={() => setRoutineMenu(false)}
        actions={[
          {
            label: 'Edit routine',
            icon: 'pencil-outline',
            onPress: () =>
              setRoutineForm({
                initial: {
                  name: routine.name,
                  description: routine.description ?? '',
                },
              }),
          },
          {
            label: 'Delete routine',
            icon: 'trash-outline',
            destructive: true,
            onPress: () =>
              setConfirm({
                title: 'Delete routine?',
                message: `This deletes "${routine.name}".`,
                onConfirm: async () => {
                  await deleteRoutine(routineId);
                },
              }),
          },
        ]}
      />

      <ActionSheet
        visible={procedureMenu !== null}
        title={procedureMenu?.name}
        onClose={() => setProcedureMenu(null)}
        actions={procedureActions}
      />

      <ActionSheet
        visible={actionMenu !== null}
        title={actionMenu?.name}
        onClose={() => setActionMenu(null)}
        actions={actionSheetActions}
      />

      {routineForm ? (
        <RoutineFormSheet
          title="Edit routine"
          mode="edit"
          domains={[]}
          systems={[]}
          initial={routineForm.initial}
          onSubmit={async (result) => {
            await updateRoutine(routineId, {
              name: result.name,
              description: result.description ?? null,
            });
          }}
          onClose={() => setRoutineForm(null)}
        />
      ) : null}

      {actionForm ? (
        <ActionFormSheet
          title={actionForm.mode === 'edit' ? 'Edit step' : 'New step'}
          initial={actionForm.initial}
          onSubmit={async (input) => {
            if (actionForm.mode === 'edit' && actionForm.actionId) {
              await updateAction(actionForm.actionId, input);
            } else {
              await createAction(actionForm.procedureId, input);
            }
          }}
          onClose={() => setActionForm(null)}
        />
      ) : null}

      {prompt ? (
        <PromptSheet
          visible
          title={prompt.title}
          message={prompt.message}
          initialValue={prompt.initialValue}
          submitLabel={prompt.submitLabel}
          onSubmit={async (value) => {
            setPrompt(null);
            await prompt.onSubmit(value);
          }}
          onClose={() => setPrompt(null)}
        />
      ) : null}

      {confirm ? (
        <ConfirmSheet
          visible
          title={confirm.title}
          message={confirm.message}
          confirmLabel="Delete"
          onConfirm={() => {
            setConfirm(null);
            void confirm.onConfirm();
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </ThemedView>
  );
}

function toActionInput(action: {
  name: string;
  description: string | null;
  durationMin: number | null;
  scheduleType: 'fixed' | 'anchored' | 'flexible';
  fixedTime: string | null;
  anchorType: 'after' | 'before' | null;
  anchorTarget: string | null;
  frequencyType: 'daily' | 'n_per_day' | 'n_per_week' | 'every_n_days' | 'every_2_weeks' | 'monthly' | 'quarterly' | 'yearly' | 'as_needed';
  frequencyValue: number | null;
  minViableLevel: 'essential' | 'standard' | 'full';
  product: string | null;
  instructions: string | null;
}): Partial<ActionInput> {
  return {
    name: action.name,
    description: action.description,
    durationMin: action.durationMin,
    scheduleType: action.scheduleType,
    fixedTime: action.fixedTime,
    anchorType: action.anchorType,
    anchorTarget: action.anchorTarget,
    frequencyType: action.frequencyType,
    frequencyValue: action.frequencyValue,
    minViableLevel: action.minViableLevel,
    product: action.product,
    instructions: action.instructions,
  };
}

function ReorderArrow({
  direction,
  disabled,
  onPress,
}: {
  direction: 'up' | 'down';
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.reorderButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && !disabled && { opacity: 0.5 },
        disabled && { opacity: 0.2 },
      ]}>
      <Ionicons
        name={direction === 'up' ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={theme.text}
      />
    </Pressable>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.metaValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaCard: {
    marginTop: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  metaValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  section: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  procedureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  procedureName: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actionName: {
    flex: 1,
  },
  reorderButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  reorderButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    fontSize: 12,
    marginTop: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  productName: {
    flexShrink: 1,
  },
});
