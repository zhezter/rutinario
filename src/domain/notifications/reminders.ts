import * as Notifications from 'expo-notifications';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { Platform } from 'react-native';

import { db } from '@/db/client';
import { actions, appSettings, procedures, routines } from '@/db/schema';

const REMINDER_PREFIX = 'reminder-';
const REMINDERS_ENABLED_KEY = 'reminders_enabled';
const ANDROID_CHANNEL_ID = 'reminders';
const CLOSE_REMINDER_PREFIX = 'close-day-';
const CLOSE_REMINDER_ENABLED_KEY = 'close_reminder_enabled';
const CLOSE_REMINDER_TIME_KEY = 'close_reminder_time';

export type ReminderTarget = {
  actionId: number;
  name: string;
  routineName: string;
  time: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getRemindersEnabled(): Promise<boolean> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, REMINDERS_ENABLED_KEY))
    .limit(1);
  return rows[0]?.value === 'true';
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: REMINDERS_ENABLED_KEY, value: enabled ? 'true' : 'false' })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: enabled ? 'true' : 'false' },
    });
}

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function listReminderTargets(): Promise<ReminderTarget[]> {
  const rows = await db
    .select({
      actionId: actions.id,
      name: actions.name,
      routineName: routines.name,
      time: actions.fixedTime,
    })
    .from(actions)
    .innerJoin(procedures, eq(actions.procedureId, procedures.id))
    .innerJoin(routines, eq(procedures.routineId, routines.id))
    .where(
      and(
        eq(actions.scheduleType, 'fixed'),
        isNotNull(actions.fixedTime),
        eq(actions.frequencyType, 'daily'),
      ),
    )
    .orderBy(actions.fixedTime);
  return rows.filter(
    (row): row is ReminderTarget => row.time !== null,
  );
}

export async function syncReminders(): Promise<void> {
  await cancelReminders();

  const enabled = await getRemindersEnabled();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return;

  if (enabled) {
    const targets = await listReminderTargets();
    for (const target of targets) {
      const [hour, minute] = target.time.split(':').map(Number);
      if (Number.isNaN(hour) || Number.isNaN(minute)) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${target.actionId}`,
        content: {
          title: target.name,
          body: target.routineName,
          sound: 'default',
          data: { actionId: target.actionId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }

  const close = await getCloseReminder();
  if (close.enabled) {
    const [hour, minute] = close.time.split(':').map(Number);
    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${CLOSE_REMINDER_PREFIX}0`,
        content: {
          title: 'Close your day',
          body: 'Wrap up today in Rutinario — a few taps and the day is done.',
          sound: 'default',
          data: { kind: 'day-close' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    }
  }
}

export async function getCloseReminder(): Promise<{ enabled: boolean; time: string }> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, [CLOSE_REMINDER_ENABLED_KEY, CLOSE_REMINDER_TIME_KEY]));
  const values = new Map(rows.map((row) => [row.key, row.value]));
  return {
    enabled: values.get(CLOSE_REMINDER_ENABLED_KEY) === 'true',
    time: values.get(CLOSE_REMINDER_TIME_KEY) ?? '21:00',
  };
}

export async function setCloseReminder(enabled: boolean, time: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: CLOSE_REMINDER_ENABLED_KEY, value: enabled ? 'true' : 'false' })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: enabled ? 'true' : 'false' } });
  await db
    .insert(appSettings)
    .values({ key: CLOSE_REMINDER_TIME_KEY, value: time })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: time } });
}

async function cancelReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (n) =>
          n.identifier.startsWith(REMINDER_PREFIX) ||
          n.identifier.startsWith(CLOSE_REMINDER_PREFIX),
      )
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
