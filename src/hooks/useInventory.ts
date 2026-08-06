import { useCallback, useState } from 'react';

import { db } from '@/db/client';

import { useLiveTables } from './useLiveTables';

export type InventoryRow = {
  id: number;
  name: string;
  category: string;
  amountRemaining: number;
  replacementIntervalDays: number | null;
  lastReplacedAt: string | null;
  usedInAction: { id: number; name: string } | null;
};

export function useInventory(): InventoryRow[] {
  const [items, setItems] = useState<InventoryRow[]>([]);

  const refetch = useCallback(async () => {
    const data = await db.query.inventoryItems.findMany({
      with: {
        usedInAction: true,
      },
      orderBy: (items, { asc }) => [asc(items.category), asc(items.name)],
    });
    setItems(data as unknown as InventoryRow[]);
  }, []);

  useLiveTables(['inventory_items'], refetch, [refetch]);

  return items;
}

export function isLowStock(item: InventoryRow, now = new Date()): boolean {
  if (item.amountRemaining <= 25) return true;
  if (item.replacementIntervalDays && item.lastReplacedAt) {
    const last = new Date(item.lastReplacedAt).getTime();
    const elapsedDays = (now.getTime() - last) / (1000 * 60 * 60 * 24);
    return elapsedDays >= item.replacementIntervalDays;
  }
  return false;
}
