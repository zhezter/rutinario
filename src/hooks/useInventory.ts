import { useCallback, useState } from 'react';

import { db } from '@/db/client';

import { useLiveTables } from './useLiveTables';

export type InventoryRow = {
  id: number;
  name: string;
  category: string;
  lowStock: number;
  notes: string | null;
};

export function useInventory(): InventoryRow[] {
  const [items, setItems] = useState<InventoryRow[]>([]);

  const refetch = useCallback(async () => {
    const data = await db.query.inventoryItems.findMany({
      orderBy: (items, { asc }) => [asc(items.category), asc(items.name)],
    });
    setItems(data as unknown as InventoryRow[]);
  }, []);

  useLiveTables(['inventory_items'], refetch, [refetch]);

  return items;
}
