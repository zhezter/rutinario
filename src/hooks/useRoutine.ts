import { useCallback, useState } from 'react';

import { db } from '@/db/client';

import { useLiveTables } from './useLiveTables';

export function useRoutine(routineId: number) {
  const [routine, setRoutine] = useState<
    Awaited<ReturnType<typeof fetchRoutine>> | undefined
  >(undefined);

  const refetch = useCallback(async () => {
    const data = await fetchRoutine(routineId);
    setRoutine(data);
  }, [routineId]);

  useLiveTables(['routines', 'procedures', 'actions'], refetch, [refetch]);

  return routine;
}

async function fetchRoutine(routineId: number) {
  return db.query.routines.findFirst({
    where: (routines, { eq }) => eq(routines.id, routineId),
    with: {
      system: {
        with: {
          domain: true,
        },
      },
      procedures: {
        orderBy: (procedures, { asc }) => [asc(procedures.sortOrder)],
        with: {
          actions: {
            orderBy: (actions, { asc }) => [asc(actions.orderIndex)],
          },
        },
      },
    },
  });
}
