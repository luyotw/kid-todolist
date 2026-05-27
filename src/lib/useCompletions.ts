import { useCallback, useEffect, useMemo, useState } from 'react';
import { storage } from './storage';

const COMPLETIONS_KEY = 'kid-todolist:completions:v1';

// Stored shape: { [YYYY-MM-DD]: string[] }
type Stored = Record<string, string[]>;

export function useCompletions(dateStr: string) {
  const [all, setAll] = useState<Stored>(() =>
    storage.get<Stored>(COMPLETIONS_KEY, {}),
  );

  useEffect(() => {
    storage.set(COMPLETIONS_KEY, all);
  }, [all]);

  const completedIds = useMemo(
    () => new Set<string>(all[dateStr] ?? []),
    [all, dateStr],
  );

  const toggle = useCallback(
    (taskId: string) => {
      setAll((prev) => {
        const current = new Set(prev[dateStr] ?? []);
        if (current.has(taskId)) current.delete(taskId);
        else current.add(taskId);
        return { ...prev, [dateStr]: Array.from(current) };
      });
    },
    [dateStr],
  );

  return { completedIds, toggle };
}
