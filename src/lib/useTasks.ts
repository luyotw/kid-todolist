import { useCallback, useEffect, useState } from 'react';
import type { Task, Weekday } from '../types';
import { storage } from './storage';
import {
  createTask as createTaskPure,
  deleteTask as deleteTaskPure,
  updateTask as updateTaskPure,
} from './tasks';

const TASKS_KEY = 'kid-todolist:tasks:v1';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    storage.get<Task[]>(TASKS_KEY, []),
  );

  useEffect(() => {
    storage.set(TASKS_KEY, tasks);
  }, [tasks]);

  const create = useCallback((title: string, weekdays?: Weekday[]) => {
    setTasks((prev) => createTaskPure(prev, title, weekdays));
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'weekdays'>>) => {
      setTasks((prev) => updateTaskPure(prev, id, patch));
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setTasks((prev) => deleteTaskPure(prev, id));
  }, []);

  return { tasks, create, update, remove };
}
