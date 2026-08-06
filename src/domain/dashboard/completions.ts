import { and, eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { completions } from '@/db/schema';
import { dateKey } from '@/lib/dates';

export async function setCompleted(actionId: number, date: Date) {
  await db
    .insert(completions)
    .values({ actionId, date: dateKey(date) })
    .onConflictDoNothing();
}

export async function setNotCompleted(actionId: number, date: Date) {
  await db
    .delete(completions)
    .where(
      and(eq(completions.actionId, actionId), eq(completions.date, dateKey(date))),
    );
}

export async function toggleCompletion(actionId: number, date: Date, currentlyCompleted: boolean) {
  if (currentlyCompleted) {
    await setNotCompleted(actionId, date);
  } else {
    await setCompleted(actionId, date);
  }
}
