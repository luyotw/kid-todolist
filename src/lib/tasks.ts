import { ALL_WEEKDAYS, type Task, type Weekday } from '../types';
import { newId } from './ids';

export function createTask(
  tasks: Task[],
  title: string,
  weekdays: Weekday[] = ALL_WEEKDAYS,
): Task[] {
  const trimmed = title.trim();
  if (!trimmed) return tasks;
  const task: Task = {
    id: newId(),
    title: trimmed,
    weekdays: dedupeWeekdays(weekdays),
    createdAt: Date.now(),
  };
  return [...tasks, task];
}

export function updateTask(
  tasks: Task[],
  id: string,
  patch: Partial<Pick<Task, 'title' | 'weekdays'>>,
): Task[] {
  return tasks.map((t) => {
    if (t.id !== id) return t;
    const next: Task = { ...t };
    if (patch.title !== undefined) {
      const trimmed = patch.title.trim();
      if (!trimmed) return t;
      next.title = trimmed;
    }
    if (patch.weekdays !== undefined) {
      next.weekdays = dedupeWeekdays(patch.weekdays);
    }
    return next;
  });
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id);
}

function dedupeWeekdays(weekdays: Weekday[]): Weekday[] {
  return Array.from(new Set(weekdays)).sort((a, b) => a - b) as Weekday[];
}
