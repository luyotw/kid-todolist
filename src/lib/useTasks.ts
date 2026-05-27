import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../types';
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

  const create = useCallback((title: string) => {
    setTasks((prev) => createTaskPure(prev, title));
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title'>>) => {
      setTasks((prev) => updateTaskPure(prev, id, patch));
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setTasks((prev) => deleteTaskPure(prev, id));
  }, []);

  return { tasks, create, update, remove };
}
