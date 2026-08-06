import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import {
  createDomain,
  createSystem,
  createRoutine,
  deleteDomain,
  deleteSystem,
  deleteRoutine,
  renameDomain,
  renameSystem,
  updateRoutine,
} from '@/domain/crud/hierarchy';
import { durationLabel, summarizeRoutine } from '@/domain/routines/summary';
import { useHierarchy, type HierarchyDomain } from '@/hooks/useHierarchy';
import { useTheme } from '@/hooks/use-theme';
import { domainColor } from '@/lib/domainColor';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { PromptSheet, ConfirmSheet } from '@/components/ui/prompt';
import { RoutineFormSheet, type RoutineFormResult } from '@/components/forms/routine-form';
import { WorkoutSection } from '@/components/workout/workout-section';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

type PromptState = {
  title: string;
  submitLabel: string;
  initialValue?: string;
  message?: string;
  onSubmit: (value: string) => void;
};

type ConfirmState = {
  title: string;
  message: string;
  onConfirm: () => void;
};

export default function RoutinesScreen() {
  const hierarchy = useHierarchy();
  const theme = useTheme();

  const [menuTarget, setMenuTarget] = useState<{
    kind: 'domain' | 'system' | 'routine';
    id: number;
    name: string;
    systemId?: number;
    description?: string | null;
    domainId?: number;
  } | null>(null);
  const [overviewMenu, setOverviewMenu] = useState(false);
  const [routineForm, setRoutineForm] = useState<{
    mode: 'new' | 'edit';
    defaultSystemId?: number;
    initial?: { name: string; description?: string };
    routineId?: number;
  } | null>(null);
  const [prompt, setPrompt] = useState<PromptState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const systems: { id: number; name: string; domainId: number }[] = [];
  const domains: { id: number; name: string }[] = [];
  for (const domain of hierarchy ?? []) {
    domains.push({ id: domain.id, name: domain.name });
    for (const system of domain.systems) {
      systems.push({ id: system.id, name: system.name, domainId: domain.id });
    }
  }

  const handleRoutineSubmit = async (result: RoutineFormResult) => {
    if (routineForm?.mode === 'edit' && routineForm.routineId) {
      await updateRoutine(routineForm.routineId, {
        name: result.name,
        description: result.description ?? null,
      });
      return;
    }
    if (result.systemId != null) {
      await createRoutine(result.systemId, result.name, result.description);
    } else if (result.domainId != null && result.newSystemName) {
      const [system] = await createSystem(result.domainId, result.newSystemName);
      await createRoutine(system.id, result.name, result.description);
    }
  };

  const openRoutineMenu = (
    kind: 'domain' | 'system' | 'routine',
    item: { id: number; name: string; systemId?: number; description?: string | null; domainId?: number },
  ) => setMenuTarget({ kind, ...item });

  const menuActions: SheetAction[] = (() => {
    if (!menuTarget) return [];
    if (menuTarget.kind === 'domain') {
      return [
        {
          label: 'Add system',
          icon: 'add-circle-outline',
          onPress: () =>
            setPrompt({
              title: 'New system',
              message: `In ${menuTarget.name}`,
              submitLabel: 'Add system',
              onSubmit: async (name) => {
                await createSystem(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename domain',
              initialValue: menuTarget.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await renameDomain(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete domain?',
              message: `This deletes "${menuTarget.name}" and everything inside it.`,
              onConfirm: async () => {
                await deleteDomain(menuTarget.id);
              },
            }),
        },
      ];
    }
    if (menuTarget.kind === 'system') {
      return [
        {
          label: 'Add routine',
          icon: 'add-circle-outline',
          onPress: () =>
            setRoutineForm({ mode: 'new', defaultSystemId: menuTarget.id }),
        },
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename system',
              initialValue: menuTarget.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await renameSystem(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete system?',
              message: `This deletes "${menuTarget.name}" and its routines.`,
              onConfirm: async () => {
                await deleteSystem(menuTarget.id);
              },
            }),
        },
      ];
    }
    return [
      {
        label: 'Edit',
        icon: 'pencil-outline',
        onPress: () =>
          setRoutineForm({
            mode: 'edit',
            routineId: menuTarget.id,
            initial: {
              name: menuTarget.name,
              description: menuTarget.description ?? '',
            },
          }),
      },
      {
        label: 'Delete',
        icon: 'trash-outline',
        destructive: true,
        onPress: () =>
          setConfirm({
            title: 'Delete routine?',
            message: `This deletes "${menuTarget.name}".`,
            onConfirm: async () => {
              await deleteRoutine(menuTarget.id);
            },
          }),
      },
    ];
  })();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>
                Routines
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Everything that keeps your days running
              </ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => setOverviewMenu(true)}
                hitSlop={8}
                style={styles.headerButton}>
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => setRoutineForm({ mode: 'new' })}
                hitSlop={8}
                style={styles.headerButton}>
                <Ionicons name="add" size={26} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          <WorkoutSection />

          {hierarchy?.map((domain) => (
            <DomainBlock
              key={domain.id}
              domain={domain}
              onLongPressDomain={(item) => openRoutineMenu('domain', item)}
              onLongPressSystem={(item) => openRoutineMenu('system', item)}
              onLongPressRoutine={(item) => openRoutineMenu('routine', item)}
            />
          ))}

          {!hierarchy || hierarchy.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No routines yet — tap + to create your first one.
            </ThemedText>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      <ActionSheet
        visible={overviewMenu}
        title="Routines"
        onClose={() => setOverviewMenu(false)}
        actions={[
          {
            label: 'New domain',
            icon: 'add-circle-outline',
            onPress: () =>
              setPrompt({
                title: 'New domain',
                submitLabel: 'Add domain',
                onSubmit: async (name) => {
                  await createDomain(name);
                },
              }),
          },
        ]}
      />

      {routineForm ? (
        <RoutineFormSheet
          title={routineForm.mode === 'edit' ? 'Edit routine' : 'New routine'}
          mode={routineForm.mode}
          domains={domains}
          systems={systems}
          initial={routineForm.initial}
          defaultSystemId={routineForm.defaultSystemId}
          onSubmit={handleRoutineSubmit}
          onClose={() => setRoutineForm(null)}
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

function DomainBlock({
  domain,
  onLongPressDomain,
  onLongPressSystem,
  onLongPressRoutine,
}: {
  domain: HierarchyDomain;
  onLongPressDomain: (item: { id: number; name: string }) => void;
  onLongPressSystem: (item: { id: number; name: string; domainId: number }) => void;
  onLongPressRoutine: (item: { id: number; name: string; systemId: number; description?: string | null }) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.domain}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        onLongPress={() => onLongPressDomain({ id: domain.id, name: domain.name })}
        delayLongPress={300}
        style={({ pressed }) => [styles.domainHeader, pressed && { opacity: 0.7 }]}>
        <View style={[styles.domainDot, { backgroundColor: domainColor(domain.name) }]} />
        <ThemedText type="smallBold" style={styles.domainName}>
          {domain.name}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>

      {expanded
        ? domain.systems.map((system) => (
            <View key={system.id} style={styles.system}>
              <Pressable
                onLongPress={() =>
                  onLongPressSystem({ id: system.id, name: system.name, domainId: domain.id })
                }
                delayLongPress={300}
                style={styles.systemName}>
                <ThemedText type="small" themeColor="textSecondary">
                  {system.name}
                </ThemedText>
              </Pressable>
              {system.routines.map((routine) => {
                const actions = routine.procedures.flatMap((procedure) => procedure.actions);
                const summary = summarizeRoutine(actions);
                const meta = [
                  summary.frequency,
                  durationLabel(summary.durationMin),
                  summary.priority,
                ]
                  .filter((part): part is string => part !== null)
                  .join(' · ');

                return (
                  <Pressable
                    key={routine.id}
                    onPress={() =>
                      router.push({
                        pathname: '/routine/[id]',
                        params: { id: String(routine.id) },
                      })
                    }
                    onLongPress={() =>
                      onLongPressRoutine({
                        id: routine.id,
                        name: routine.name,
                        description: routine.description,
                        systemId: system.id,
                      })
                    }
                    delayLongPress={300}>
                    {({ pressed }) => (
                      <Card style={[styles.routineCard, pressed && { opacity: 0.6 }]}>
                        <ThemedText type="smallBold">{routine.name}</ThemedText>
                        {routine.description ? (
                          <ThemedText type="small" themeColor="textSecondary">
                            {routine.description}
                          </ThemedText>
                        ) : null}
                        <ThemedText type="small" themeColor="textSecondary">
                          {meta}
                        </ThemedText>
                      </Card>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))
        : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: BottomTabInset,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  domain: {
    gap: Spacing.two,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  domainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  domainName: {
    fontSize: 16,
    flex: 1,
  },
  system: {
    gap: Spacing.two,
  },
  systemName: {
    fontSize: 12,
    marginLeft: Spacing.three,
  },
  routineCard: {
    padding: Spacing.three,
  },
});
