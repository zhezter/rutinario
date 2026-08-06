import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GhostButton, PrimaryButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { finishShopping } from '@/domain/crud/inventory';
import { useInventory, type InventoryRow } from '@/hooks/useInventory';
import { useTheme } from '@/hooks/use-theme';

export default function ShoppingScreen() {
  const items = useInventory();
  const lowItems = items.filter((item) => item.lowStock === 1);

  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);

  const toggle = (id: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleFinish = () => {
    void (async () => {
      await finishShopping([...checked]);
      setFinished(true);
    })();
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Shopping list' }} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {finished ? (
          <CompletionView count={checked.size} onBack={() => router.back()} />
        ) : lowItems.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="subtitle">Nothing to buy</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Everything is in stock. Mark products as low stock from the Inventory tab.
            </ThemedText>
            <GhostButton label="Back" onPress={() => router.back()} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryCount}>
                  {checked.size}/{lowItems.length}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  selected
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Check what you bought. Bought items go back to full stock; the rest stay on your list.
              </ThemedText>
            </Card>

            <Card style={styles.listCard}>
              {lowItems.map((item) => (
                <ShoppingRow key={item.id} item={item} checked={checked.has(item.id)} onToggle={toggle} />
              ))}
            </Card>

            <PrimaryButton
              label={
                checked.size === 0
                  ? 'Nothing bought this time'
                  : `Finish shopping · ${checked.size} restocked`
              }
              onPress={handleFinish}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ShoppingRow({
  item,
  checked,
  onToggle,
}: {
  item: InventoryRow;
  checked: boolean;
  onToggle: (id: number) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.success : theme.textSecondary,
            backgroundColor: checked ? theme.success : 'transparent',
          },
        ]}>
        {checked && (
          <ThemedText style={styles.checkmark} themeColor="background">
            ✓
          </ThemedText>
        )}
      </View>
      <View style={styles.nameBlock}>
        <ThemedText
          type="smallBold"
          style={checked && { textDecorationLine: 'line-through', color: theme.textSecondary }}>
          {item.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.category}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CompletionView({ count, onBack }: { count: number; onBack: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.complete}>
      <View style={[styles.completeBadge, { backgroundColor: theme.success }]}>
        <Ionicons name="checkmark" size={44} color={theme.background} />
      </View>
      <ThemedText type="subtitle" style={styles.completeTitle}>
        Shopping done
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.completeText}>
        {count === 0
          ? 'No products restocked this time.'
          : `${count} ${count === 1 ? 'product' : 'products'} restocked. Items you did not buy stay on your list.`}
      </ThemedText>
      <View style={styles.completeButtons}>
        <PrimaryButton label="Back to inventory" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  summaryCard: {
    gap: Spacing.one,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  summaryCount: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: 700,
  },
  listCard: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: 700,
  },
  nameBlock: {
    flex: 1,
    gap: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  complete: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  completeBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  completeTitle: {
    textAlign: 'center',
  },
  completeText: {
    textAlign: 'center',
  },
  completeButtons: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
    maxWidth: 360,
  },
});
