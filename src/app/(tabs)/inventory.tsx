import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/dashboard/progress-bar';
import { InventoryFormSheet } from '@/components/forms/inventory-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ConfirmSheet } from '@/components/ui/prompt';
import { ActionSheet, type SheetAction } from '@/components/ui/sheet';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
  type InventoryInput,
} from '@/domain/crud/inventory';
import { useActionOptions } from '@/hooks/useActionOptions';
import { isLowStock, useInventory, type InventoryRow } from '@/hooks/useInventory';
import { useTheme } from '@/hooks/use-theme';

export default function InventoryScreen() {
  const items = useInventory();
  const actionOptions = useActionOptions();
  const theme = useTheme();

  const [form, setForm] = useState<{
    initial?: Partial<InventoryInput> & { usedInActionId?: number | null };
    itemId?: number;
  } | null>(null);
  const [menuTarget, setMenuTarget] = useState<InventoryRow | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const groups = new Map<string, InventoryRow[]>();
  for (const item of items) {
    const group = groups.get(item.category) ?? [];
    group.push(item);
    groups.set(item.category, group);
  }

  const menuActions: SheetAction[] = menuTarget
    ? [
        {
          label: 'Edit',
          icon: 'pencil-outline',
          onPress: () =>
            setForm({
              itemId: menuTarget.id,
              initial: {
                name: menuTarget.name,
                category: menuTarget.category,
                amountRemaining: menuTarget.amountRemaining,
                replacementIntervalDays: menuTarget.replacementIntervalDays,
                usedInActionId: menuTarget.usedInAction?.id ?? null,
              },
            }),
        },
        {
          label: 'Delete',
          icon: 'trash-outline',
          destructive: true,
          onPress: () =>
            setConfirm({
              title: 'Delete product?',
              message: `This removes "${menuTarget.name}".`,
              onConfirm: async () => {
                await deleteInventoryItem(menuTarget.id);
              },
            }),
        },
      ]
    : [];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>
                Inventory
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                What you use, and when to restock
              </ThemedText>
            </View>
            <Pressable onPress={() => setForm({})} hitSlop={8} style={styles.headerButton}>
              <Ionicons name="add" size={26} color={theme.accent} />
            </Pressable>
          </View>

          {[...groups.entries()].map(([category, group]) => (
            <View key={category} style={styles.group}>
              <ThemedText type="smallBold" style={styles.groupTitle}>
                {category}
              </ThemedText>
              {group.map((item) => (
                <Pressable
                  key={item.id}
                  onLongPress={() => setMenuTarget(item)}
                  delayLongPress={300}>
                  {({ pressed }) => (
                    <InventoryCard item={item} pressed={pressed} />
                  )}
                </Pressable>
              ))}
            </View>
          ))}

          {items.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              No products yet — tap + to add your first one.
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

      {form ? (
        <InventoryFormSheet
          title={form.itemId ? 'Edit product' : 'New product'}
          initial={form.initial}
          actionOptions={actionOptions}
          onSubmit={async (input) => {
            if (form.itemId) {
              await updateInventoryItem(form.itemId, input);
            } else {
              await createInventoryItem(input);
            }
          }}
          onClose={() => setForm(null)}
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

function InventoryCard({ item, pressed }: { item: InventoryRow; pressed: boolean }) {
  const theme = useTheme();
  const low = isLowStock(item);

  return (
    <Card style={pressed ? styles.pressed : undefined}>
      <View style={styles.row}>
        <View style={styles.nameBlock}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          {item.usedInAction ? (
            <ThemedText type="small" themeColor="textSecondary">
              For {item.usedInAction.name}
            </ThemedText>
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {item.amountRemaining}% left
        </ThemedText>
      </View>

      <ProgressBar completed={item.amountRemaining} total={100} />

      {low ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          Running low — restock soon
        </ThemedText>
      ) : null}
    </Card>
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
  headerButton: {
    padding: Spacing.one,
  },
  group: {
    gap: Spacing.two,
  },
  groupTitle: {
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  nameBlock: {
    flex: 1,
    gap: 1,
  },
});
