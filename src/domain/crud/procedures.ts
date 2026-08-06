import { asc, eq, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { procedures } from '@/db/schema';

export async function createProcedure(routineId: number, name: string, description?: string) {
  const rows = await db
    .select({ m: max(procedures.sortOrder) })
    .from(procedures)
    .where(eq(procedures.routineId, routineId));
  const sortOrder = (rows[0].m ?? 0) + 1;
  return db
    .insert(procedures)
    .values({ routineId, name, sortOrder, description: description?.trim() || null })
    .returning();
}

export async function updateProcedure(
  id: number,
  data: { name?: string; description?: string | null },
) {
  return db.update(procedures).set(data).where(eq(procedures.id, id));
}

export async function deleteProcedure(id: number) {
  return db.delete(procedures).where(eq(procedures.id, id));
}

export async function moveProcedure(procedureId: number, direction: 'up' | 'down') {
  const rows = await db
    .select({ id: procedures.id, routineId: procedures.routineId, sortOrder: procedures.sortOrder })
    .from(procedures)
    .where(eq(procedures.id, procedureId));
  const procedure = rows[0];
  if (!procedure) return;

  const siblings = await db
    .select({ id: procedures.id, sortOrder: procedures.sortOrder })
    .from(procedures)
    .where(eq(procedures.routineId, procedure.routineId))
    .orderBy(asc(procedures.sortOrder), asc(procedures.id));

  const index = siblings.findIndex((sibling) => sibling.id === procedureId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= siblings.length) return;

  await db
    .update(procedures)
    .set({ sortOrder: siblings[target].sortOrder })
    .where(eq(procedures.id, procedureId));
  await db
    .update(procedures)
    .set({ sortOrder: siblings[index].sortOrder })
    .where(eq(procedures.id, siblings[target].id));
}
