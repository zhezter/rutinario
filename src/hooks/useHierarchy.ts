import { useCallback, useState } from 'react';

import { db } from '@/db/client';

import { useLiveTables } from './useLiveTables';

export type HierarchyDomain = Awaited<ReturnType<typeof fetchHierarchy>>[number];

export function useHierarchy() {
  const [hierarchy, setHierarchy] = useState<HierarchyDomain[] | null>(null);

  const refetch = useCallback(async () => {
    const data = await fetchHierarchy();
    setHierarchy(data);
  }, []);

  useLiveTables(
    ['domains', 'systems', 'routines', 'procedures', 'actions'],
    refetch,
    [refetch],
  );

  return hierarchy;
}

function fetchHierarchy() {
  return db.query.domains.findMany({
    orderBy: (domains, { asc }) => [asc(domains.sortOrder)],
    with: {
      systems: {
        orderBy: (systems, { asc }) => [asc(systems.sortOrder)],
        with: {
          routines: {
            orderBy: (routines, { asc }) => [asc(routines.sortOrder)],
            with: {
              procedures: {
                orderBy: (procedures, { asc }) => [asc(procedures.sortOrder)],
                with: {
                  actions: {
                    orderBy: (actions, { asc }) => [asc(actions.orderIndex)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}
