import type { Task } from '../types';
import { newId } from './ids';

export function createTask(tasks: Task[], title: string): Task[] {
  const trimmed = title.trim();
  if (!trimmed) return tasks;
  const task: Task = {
    id: newId(),
    title: trimmed,
    createdAt: Date.now(),
  };
  return [...tasks, task];
}

export function updateTask(
  tasks: Task[],
  id: string,
  patch: Partial<Pick<Task, 'title'>>,
): Task[] {
  return tasks.map((t) => {
    if (t.id !== id) return t;
    const next = { ...t, ...patch };
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (!trimmed) return t;
      next.title = trimmed;
    }
    return next;
  });
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id);
}
