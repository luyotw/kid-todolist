import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdhocTask } from '../types';
import { storage } from './storage';
import {
  createAdhoc as createAdhocPure,
  deleteAdhoc as deleteAdhocPure,
  getAdhocFor,
} from './adhoc';

const ADHOC_KEY = 'kid-todolist:adhoc:v1';

export function useAdhoc(dateStr: string) {
  const [all, setAll] = useState<AdhocTask[]>(() =>
    storage.get<AdhocTask[]>(ADHOC_KEY, []),
  );

  useEffect(() => {
    storage.set(ADHOC_KEY, all);
  }, [all]);

  const todays = useMemo(() => getAdhocFor(all, dateStr), [all, dateStr]);

  const add = useCallback(
    (title: string) => {
      setAll((prev) => createAdhocPure(prev, title, dateStr));
    },
    [dateStr],
  );

  const remove = useCallback((id: string) => {
    setAll((prev) => deleteAdhocPure(prev, id));
  }, []);

  return { adhocToday: todays, add, remove };
}
