import { useCallback, useEffect, useState } from 'react';

import { getDayNote, saveDayNote } from '@/domain/dashboard/notes';
import { hapticSelection } from '@/lib/haptics';

export function useDayNote(date: string) {
  const [note, setNote] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getDayNote(date).then((value) => {
      if (cancelled) return;
      setNote(value);
      setDirty(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const changeNote = useCallback((value: string) => {
    setNote(value);
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    await saveDayNote(date, note);
    setDirty(false);
    hapticSelection();
  }, [date, note]);

  return { note, changeNote, dirty, save };
}
