import { useCallback, useState } from 'react';

import { getDayClosure } from '@/domain/dashboard/dayClosure';
import { useLiveTables } from '@/hooks/useLiveTables';

export function useDayClosure(date: string): { closedAt: number | null } {
  const [closedAt, setClosedAt] = useState<number | null>(null);

  const refetch = useCallback(async () => {
    setClosedAt(await getDayClosure(date));
  }, [date]);

  useLiveTables(['day_closures'], refetch, [refetch]);

  return { closedAt };
}
