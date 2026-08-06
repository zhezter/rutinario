import { useCallback, useState } from 'react';

import { db } from '@/db/client';
import { buildDailyPlan } from '@/domain/dashboard/buildDailyPlan';
import type { ActionRow, DailyPlan } from '@/domain/dashboard/types';
import { useUIStore } from '@/stores/uiStore';

import { useLiveTables } from './useLiveTables';

export function useDailyPlan(today: Date): DailyPlan | null {
  const activeLevel = useUIStore((state) => state.activeLevel);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  const refetch = useCallback(async () => {
    const rows = await db.query.actions.findMany({
      with: {
        procedure: {
          with: {
            routine: {
              with: {
                system: {
                  with: {
                    domain: true,
                  },
                },
              },
            },
          },
        },
        completions: true,
      },
      orderBy: (actions, { asc }) => [asc(actions.orderIndex)],
    });
    setPlan(buildDailyPlan(rows as unknown as ActionRow[], today, activeLevel));
  }, [today, activeLevel]);

  useLiveTables(['actions', 'completions'], refetch, [refetch]);

  return plan;
}
