import { eq, inArray } from 'drizzle-orm';

import { db } from '@/db/client';
import { inventoryItems } from '@/db/schema';

export type InventoryInput = {
  name: string;
  category: string;
  notes?: string | null;
};

export async function createInventoryItem(input: InventoryInput) {
  return db.insert(inventoryItems).values(normalize(input)).returning();
}

export async function updateInventoryItem(id: number, input: InventoryInput) {
  return db.update(inventoryItems).set(normalize(input)).where(eq(inventoryItems.id, id));
}

export async function deleteInventoryItem(id: number) {
  return db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

export async function setLowStock(id: number, low: boolean) {
  return db
    .update(inventoryItems)
    .set({ lowStock: low ? 1 : 0 })
    .where(eq(inventoryItems.id, id));
}

export async function finishShopping(itemIds: number[]) {
  if (itemIds.length === 0) return;
  await db
    .update(inventoryItems)
    .set({ lowStock: 0 })
    .where(inArray(inventoryItems.id, itemIds));
}

function normalize(input: InventoryInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    notes: input.notes?.trim() || null,
  };
}
