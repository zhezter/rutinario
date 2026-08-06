import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';
import type { ActiveLevel } from '@/domain/dashboard/types';

const CHECKIN_DATE_KEY = 'energy_checkin_date';
const CHECKIN_LEVEL_KEY = 'energy_checkin_level';

export async function getEnergyCheckinDate(): Promise<string | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, CHECKIN_DATE_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function getStoredEnergyLevel(): Promise<ActiveLevel | null> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, CHECKIN_LEVEL_KEY))
    .limit(1);
  const value = rows[0]?.value;
  return value === 'minimum' || value === 'standard' || value === 'full' ? value : null;
}

export async function saveEnergyCheckin(level: ActiveLevel, date: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: CHECKIN_DATE_KEY, value: date })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: date } });
  await db
    .insert(appSettings)
    .values({ key: CHECKIN_LEVEL_KEY, value: level })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: level } });
}
