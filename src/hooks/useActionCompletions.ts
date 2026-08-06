import { eq } from 'drizzle-orm';
import { useCallback, useState } from 'react';

import { db } from '@/db/client';
import { completions } from '@/db/schema';
import { dateKey } from '@/lib/dates';

import { useLiveTables } from './useLiveTables';

export function useActionCompletions(actionIds: number[], date: Date) {
  const [state, setState] = useState<{ loaded: boolean; completed: Map<number, number> }>({
    loaded: false,
    completed: new Map(),
  });

  const key = actionIds.slice().sort((a, b) => a - b).join(',');

  const refetch = useCallback(async () => {
    if (key === '') {
      setState({ loaded: true, completed: new Map() });
      return;
    }
    const rows = await db
      .select({ actionId: completions.actionId, completedAt: completions.completedAt })
      .from(completions)
      .where(eq(completions.date, dateKey(date)));
    const ids = new Set(key.split(',').map(Number));
    const next = new Map<number, number>();
    for (const row of rows) {
      if (ids.has(row.actionId)) next.set(row.actionId, row.completedAt);
    }
    setState({ loaded: true, completed: next });
  }, [key, date]);

  useLiveTables(['completions'], refetch, [refetch]);

  return state;
}
