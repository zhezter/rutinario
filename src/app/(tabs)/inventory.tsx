import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  setLowStock,
  updateInventoryItem,
  type InventoryInput,
} from '@/domain/crud/inventory';
import { useInventory, type InventoryRow } from '@/hooks/useInventory';
import { useTheme } from '@/hooks/use-theme';

export default function InventoryScreen() {
  const items = useInventory();
  const theme = useTheme();

  const [form, setForm] = useState<{ initial?: Partial<InventoryInput>; itemId?: number } | null>(null);
  const [menuTarget, setMenuTarget] = useState<InventoryRow | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const lowCount = items.filter((item) => item.lowStock === 1).length;

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
              },
            }),
        },
        menuTarget.lowStock === 1
          ? {
              label: 'Restocked',
              icon: 'checkmark-circle-outline',
              onPress: () => void setLowStock(menuTarget.id, false),
            }
          : {
              label: 'Mark low stock',
              icon: 'alert-circle-outline',
              onPress: () => void setLowStock(menuTarget.id, true),
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
                Track products and plan your next shop
              </ThemedText>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => router.push('/shopping')}
                hitSlop={8}
                style={styles.headerButton}>
                <View>
                  <Ionicons name="cart-outline" size={24} color={theme.text} />
                  {lowCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: theme.warning }]}>
                      <ThemedText style={styles.badgeText}>{lowCount}</ThemedText>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <Pressable onPress={() => setForm({})} hitSlop={8} style={styles.headerButton}>
                <Ionicons name="add" size={26} color={theme.accent} />
              </Pressable>
            </View>
          </View>

          {lowCount > 0 ? (
            <Pressable
              onPress={() => router.push('/shopping')}
              style={({ pressed }) => [
                styles.shoppingBanner,
                { backgroundColor: theme.backgroundSelected },
                pressed && { opacity: 0.7 },
              ]}>
              <Ionicons name="cart-outline" size={20} color={theme.warning} />
              <ThemedText type="smallBold" style={styles.shoppingBannerText}>
                Shopping list · {lowCount} {lowCount === 1 ? 'item' : 'items'} low on stock
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}

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
                    <InventoryCard
                      item={item}
                      pressed={pressed}
                      onToggleLowStock={() =>
                        void setLowStock(item.id, item.lowStock === 0)
                      }
                    />
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

function InventoryCard({
  item,
  pressed,
  onToggleLowStock,
}: {
  item: InventoryRow;
  pressed: boolean;
  onToggleLowStock: () => void;
}) {
  const theme = useTheme();
  const low = item.lowStock === 1;

  return (
    <Card style={pressed ? styles.pressed : undefined}>
      <View style={styles.row}>
        <View style={styles.nameBlock}>
          <ThemedText type="smallBold">{item.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {item.category}
          </ThemedText>
        </View>
        <Pressable
          onPress={onToggleLowStock}
          hitSlop={8}
          style={({ pressed }) => [
            styles.statusPill,
            { backgroundColor: low ? theme.warning : theme.backgroundSelected },
            pressed && { opacity: 0.7 },
          ]}>
          <ThemedText
            type="smallBold"
            style={{ color: low ? '#FFFFFF' : theme.textSecondary }}>
            {low ? 'Low stock' : 'In stock'}
          </ThemedText>
        </Pressable>
      </View>
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
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  headerButton: {
    padding: Spacing.one,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
  shoppingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  shoppingBannerText: {
    flex: 1,
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
  statusPill: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
