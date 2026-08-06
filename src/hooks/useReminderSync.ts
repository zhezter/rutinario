import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

import { syncReminders } from '@/domain/notifications/reminders';

const SYNC_TABLES = ['actions', 'app_settings', 'procedures', 'routines'];
const DEBOUNCE_MS = 2000;

export function useReminderSync(ready: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    void syncReminders();

    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (!SYNC_TABLES.includes(tableName)) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!cancelled) void syncReminders();
      }, DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      listener.remove();
    };
  }, [ready]);
}
