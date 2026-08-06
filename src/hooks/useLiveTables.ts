import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

/**
 * Runs `run` once on mount and whenever a change is reported on any of the
 * given `tables`, then re-runs it. Unlike drizzle's `useLiveQuery` this can
 * listen to several tables at once (e.g. `actions` + `completions`).
 */
export function useLiveTables(
  tables: string[],
  run: () => void | Promise<void>,
  deps: unknown[],
) {
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    void runRef.current();
    const listener = addDatabaseChangeListener(({ tableName }) => {
      if (tables.includes(tableName)) void runRef.current();
    });
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
