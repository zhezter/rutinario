import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { dayNotes } from '@/db/schema';

export async function getDayNote(date: string): Promise<string> {
  const rows = await db
    .select({ note: dayNotes.note })
    .from(dayNotes)
    .where(eq(dayNotes.date, date))
    .limit(1);
  return rows[0]?.note ?? '';
}

export async function saveDayNote(date: string, note: string): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) {
    await db.delete(dayNotes).where(eq(dayNotes.date, date));
    return;
  }
  await db
    .insert(dayNotes)
    .values({ date, note: trimmed, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: dayNotes.date,
      set: { note: trimmed, updatedAt: Date.now() },
    });
}
