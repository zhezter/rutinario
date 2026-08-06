import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { dayClosures } from '@/db/schema';

export async function getDayClosure(date: string): Promise<number | null> {
  const rows = await db
    .select({ closedAt: dayClosures.closedAt })
    .from(dayClosures)
    .where(eq(dayClosures.date, date))
    .limit(1);
  return rows[0]?.closedAt ?? null;
}

export async function closeDay(date: string): Promise<void> {
  await db
    .insert(dayClosures)
    .values({ date, closedAt: Date.now() })
    .onConflictDoUpdate({ target: dayClosures.date, set: { closedAt: Date.now() } });
}

export async function uncloseDay(date: string): Promise<void> {
  await db.delete(dayClosures).where(eq(dayClosures.date, date));
}
