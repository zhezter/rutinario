import { useCallback, useState } from 'react';

import { db } from '@/db/client';

import { useLiveTables } from './useLiveTables';

export function useActionOptions(): { id: number; label: string }[] {
  const [options, setOptions] = useState<{ id: number; label: string }[]>([]);

  const refetch = useCallback(async () => {
    const rows = await db.query.actions.findMany({
      with: {
        procedure: {
          with: {
            routine: true,
          },
        },
      },
      orderBy: (actions, { asc }) => [asc(actions.name)],
    });
    setOptions(
      rows.map((row) => ({
        id: row.id,
        label: `${row.name} — ${row.procedure.routine.name}`,
      })),
    );
  }, []);

  useLiveTables(['actions', 'procedures', 'routines'], refetch, [refetch]);

  return options;
}
