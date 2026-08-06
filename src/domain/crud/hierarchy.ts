import { eq, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { domains, routines, systems } from '@/db/schema';

export async function createDomain(name: string) {
  const rows = await db.select({ m: max(domains.sortOrder) }).from(domains);
  const sortOrder = (rows[0].m ?? 0) + 1;
  return db.insert(domains).values({ name, sortOrder }).returning();
}

export async function renameDomain(id: number, name: string) {
  return db.update(domains).set({ name }).where(eq(domains.id, id));
}

export async function deleteDomain(id: number) {
  return db.delete(domains).where(eq(domains.id, id));
}

export async function createSystem(domainId: number, name: string) {
  const rows = await db
    .select({ m: max(systems.sortOrder) })
    .from(systems)
    .where(eq(systems.domainId, domainId));
  const sortOrder = (rows[0].m ?? 0) + 1;
  return db.insert(systems).values({ domainId, name, sortOrder }).returning();
}

export async function renameSystem(id: number, name: string) {
  return db.update(systems).set({ name }).where(eq(systems.id, id));
}

export async function deleteSystem(id: number) {
  return db.delete(systems).where(eq(systems.id, id));
}

export async function createRoutine(systemId: number, name: string, description?: string) {
  const rows = await db
    .select({ m: max(routines.sortOrder) })
    .from(routines)
    .where(eq(routines.systemId, systemId));
  const sortOrder = (rows[0].m ?? 0) + 1;
  return db
    .insert(routines)
    .values({ systemId, name, sortOrder, description: description?.trim() || null })
    .returning();
}

export async function updateRoutine(
  id: number,
  data: { name?: string; description?: string | null },
) {
  return db.update(routines).set(data).where(eq(routines.id, id));
}

export async function deleteRoutine(id: number) {
  return db.delete(routines).where(eq(routines.id, id));
}
