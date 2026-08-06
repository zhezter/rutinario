import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { inventoryItems } from '@/db/schema';

export type InventoryInput = {
  name: string;
  category: string;
  amountRemaining: number;
  replacementIntervalDays: number | null;
  usedInActionId: number | null;
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

function normalize(input: InventoryInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    amountRemaining: Math.max(0, Math.min(100, input.amountRemaining)),
    replacementIntervalDays: input.replacementIntervalDays,
    usedInActionId: input.usedInActionId,
  };
}
