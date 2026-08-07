import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { Spacing } from '@/constants/theme';
import { listCatalogExercises, type CatalogExercise } from '@/domain/workouts/catalog';
import { useLiveTables } from '@/hooks/useLiveTables';
import { useTheme } from '@/hooks/use-theme';

export function CatalogPickerSheet({
  visible,
  onClose,
  onSelect,
  onCreateNew,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: CatalogExercise) => void;
  onCreateNew: () => void;
}) {
  const theme = useTheme();
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [query, setQuery] = useState('');

  useLiveTables(
    ['exercises', 'workout_exercises'],
    async () => setExercises(await listCatalogExercises()),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.muscleGroup ?? '').toLowerCase().includes(q),
    );
  }, [exercises, query]);

  return (
    <Sheet visible={visible} title="Pick an exercise" onClose={onClose}>
      <Field
        label=""
        placeholder="Search catalog…"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      {filtered.map((exercise) => (
        <Pressable
          key={exercise.id}
          onPress={() => {
            setQuery('');
            onSelect(exercise);
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>
              {exercise.muscleGroup ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {exercise.muscleGroup}
                </ThemedText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </View>
        </Pressable>
      ))}
      {filtered.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText type="smallBold">{query ? 'Not in the catalog' : 'Catalog is empty'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {query
              ? 'You can add it below as a new exercise.'
              : 'Create your own exercise below.'}
          </ThemedText>
        </Card>
      ) : null}
      <Pressable
        onPress={() => {
          setQuery('');
          onCreateNew();
        }}
        style={({ pressed }) => [
          styles.newButton,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          Create new exercise
        </ThemedText>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyCard: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
