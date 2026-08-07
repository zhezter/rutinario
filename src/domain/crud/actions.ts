import { asc, eq, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { actions, type AnchorType, type FrequencyType, type ScheduleType, type ViabilityLevel } from '@/db/schema';

export type ActionInput = {
  name: string;
  description?: string | null;
  durationMin?: number | null;
  scheduleType: ScheduleType;
  fixedTime?: string | null;
  anchorType?: AnchorType | null;
  anchorTarget?: string | null;
  reminderTime?: string | null;
  frequencyType: FrequencyType;
  frequencyValue?: number | null;
  minViableLevel: ViabilityLevel;
  product?: string | null;
  instructions?: string | null;
};

export async function createAction(procedureId: number, input: ActionInput) {
  const rows = await db
    .select({ m: max(actions.orderIndex) })
    .from(actions)
    .where(eq(actions.procedureId, procedureId));
  const orderIndex = (rows[0].m ?? 0) + 1;
  return db.insert(actions).values({ procedureId, orderIndex, ...normalize(input) }).returning();
}

export async function updateAction(id: number, input: ActionInput) {
  return db.update(actions).set(normalize(input)).where(eq(actions.id, id));
}

export async function deleteAction(id: number) {
  return db.delete(actions).where(eq(actions.id, id));
}

export async function moveAction(actionId: number, direction: 'up' | 'down') {
  const rows = await db
    .select({ id: actions.id, procedureId: actions.procedureId, orderIndex: actions.orderIndex })
    .from(actions)
    .where(eq(actions.id, actionId));
  const action = rows[0];
  if (!action) return;

  const siblings = await db
    .select({ id: actions.id, orderIndex: actions.orderIndex })
    .from(actions)
    .where(eq(actions.procedureId, action.procedureId))
    .orderBy(asc(actions.orderIndex), asc(actions.id));

  const index = siblings.findIndex((sibling) => sibling.id === actionId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= siblings.length) return;

  await db
    .update(actions)
    .set({ orderIndex: siblings[target].orderIndex })
    .where(eq(actions.id, actionId));
  await db
    .update(actions)
    .set({ orderIndex: siblings[index].orderIndex })
    .where(eq(actions.id, siblings[target].id));
}

function normalize(input: ActionInput) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    durationMin: input.durationMin || null,
    scheduleType: input.scheduleType,
    fixedTime:
      input.scheduleType === 'fixed' ? input.fixedTime?.trim() || null : null,
    anchorType:
      input.scheduleType === 'anchored' ? (input.anchorType ?? null) : null,
    anchorTarget:
      input.scheduleType === 'anchored' ? input.anchorTarget?.trim() || null : null,
    reminderTime: input.reminderTime?.trim() || null,
    frequencyType: input.frequencyType,
    frequencyValue: input.frequencyValue || null,
    minViableLevel: input.minViableLevel,
    product: input.product?.trim() || null,
    instructions: input.instructions?.trim() || null,
  };
}
