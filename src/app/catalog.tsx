import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { PillGroup } from '@/components/ui/pill-group';
import { ActionSheet, Sheet, type SheetAction } from '@/components/ui/sheet';
import { ConfirmSheet, PromptSheet } from '@/components/ui/prompt';
import { Spacing } from '@/constants/theme';
import {
  MUSCLE_GROUPS,
  createExercise,
  deleteExerciseIfUnused,
  listCatalogExercises,
  renameExercise,
  setExerciseMuscleGroup,
  type CatalogExercise,
} from '@/domain/workouts/catalog';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

const GROUP_OPTIONS = [...MUSCLE_GROUPS, ''] as const;
type GroupOption = (typeof GROUP_OPTIONS)[number];

const GROUP_LABELS = Object.fromEntries(
  [...MUSCLE_GROUPS, ''].map((group) => [group, group === '' ? 'None' : group]),
) as Record<GroupOption, string>;

type Section = {
  title: string;
  data: CatalogExercise[];
};

type MenuTarget = CatalogExercise;

export default function CatalogScreen() {
  const theme = useTheme();
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [query, setQuery] = useState('');
  const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    initialValue?: string;
    submitLabel: string;
    onSubmit: (value: string) => void;
  } | null>(null);
  const [groupPicker, setGroupPicker] = useState<{
    title: string;
    initial: string;
    onSelect: (group: string | null) => void;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useLiveTables(
    ['exercises', 'workout_exercises', 'workout_days', 'workouts'],
    async () => setExercises(await listCatalogExercises()),
    [],
  );

  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? exercises.filter((item) => item.name.toLowerCase().includes(q))
      : exercises;
    const byGroup = new Map<string, CatalogExercise[]>();
    for (const item of filtered) {
      const key = item.muscleGroup ?? '';
      const list = byGroup.get(key);
      if (list) list.push(item);
      else byGroup.set(key, [item]);
    }
    const known = [...MUSCLE_GROUPS].filter((group) => byGroup.has(group));
    const unknown = [...byGroup.keys()]
      .filter((key) => key !== '' && !(MUSCLE_GROUPS as readonly string[]).includes(key))
      .sort();
    const keys = [...known, ...unknown, ''].filter((key) => byGroup.has(key));
    return keys.map((key) => ({
      title: key === '' ? 'Uncategorized' : key,
      data: byGroup.get(key) ?? [],
    }));
  }, [exercises, query]);

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Rename',
          icon: 'pencil-outline',
          onPress: () =>
            setPrompt({
              title: 'Rename exercise',
              initialValue: menuTarget.name,
              submitLabel: 'Rename',
              onSubmit: async (name) => {
                await renameExercise(menuTarget.id, name);
              },
            }),
        },
        {
          label: 'Set muscle group',
          icon: 'body-outline',
          onPress: () =>
            setGroupPicker({
              title: 'Muscle group',
              initial: menuTarget.muscleGroup ?? '',
              onSelect: async (group) => {
                await setExerciseMuscleGroup(menuTarget.id, group);
              },
            }),
        },
        ...(menuTarget.usageCount === 0
          ? [
              {
                label: 'Delete',
                icon: 'trash-outline',
                destructive: true,
                onPress: () =>
                  setConfirm({
                    title: 'Delete exercise?',
                    message: `This removes "${menuTarget.name}" from the catalog.`,
                    onConfirm: async () => {
                      await deleteExerciseIfUnused(menuTarget.id);
                    },
                  }),
              } as SheetAction,
            ]
          : []),
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              Exercise catalog
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Browse by muscle group and keep your library tidy
            </ThemedText>
          </View>
        </View>

        <Field
          label=""
          placeholder="Search exercises…"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          style={styles.search}
        />

        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setMenuTarget(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Card style={styles.itemCard}>
                <View style={styles.itemText}>
                  <ThemedText type="smallBold">{item.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.usageCount > 0
                      ? `Used in ${item.usageCount} workout${item.usageCount === 1 ? '' : 's'}`
                      : 'Not used yet'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <ThemedText type="smallBold">
                {query ? 'No matches' : 'No exercises yet'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {query
                  ? 'Try a different name.'
                  : 'Exercises you add to a workout appear here automatically.'}
              </ThemedText>
            </Card>
          }
        />

        <View style={styles.footer}>
          <Pressable
            onPress={() =>
              setPrompt({
                title: 'New exercise',
                message: 'Add an exercise to the catalog, then pick its muscle group.',
                placeholder: 'Bench Press',
                submitLabel: 'Continue',
                onSubmit: (value) => {
                  const name = value;
                  setPrompt(null);
                  setGroupPicker({
                    title: 'Muscle group',
                    initial: '',
                    onSelect: async (group) => {
                      await createExercise(name, group ?? undefined);
                    },
                  });
                },
              })
            }
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Ionicons name="add" size={20} color={theme.accent} />
            <ThemedText type="smallBold">New exercise</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={menuTarget !== null}
        title={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
        actions={menuActions}
      />

      {prompt ? (
        <PromptSheet
          visible
          title={prompt.title}
          message={prompt.message}
          placeholder={prompt.placeholder}
          initialValue={prompt.initialValue}
          submitLabel={prompt.submitLabel}
          onSubmit={(value) => {
            setPrompt(null);
            void prompt.onSubmit(value);
          }}
          onClose={() => setPrompt(null)}
        />
      ) : null}

      {groupPicker ? (
        <Sheet visible title={groupPicker.title} onClose={() => setGroupPicker(null)}>
          <ThemedText type="small" themeColor="textSecondary">
            Main muscle group
          </ThemedText>
          <PillGroup
            options={GROUP_OPTIONS}
            value={groupPicker.initial as GroupOption}
            labels={GROUP_LABELS}
            onChange={(group) => {
              const next = group === '' ? null : group;
              void groupPicker.onSelect(next);
              setGroupPicker(null);
            }}
          />
        </Sheet>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  headerText: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
  },
  search: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  itemCard: {
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.three,
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
});
