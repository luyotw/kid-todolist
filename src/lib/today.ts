import type { Task } from '../types';
import { isTaskScheduledOn } from './schedule';

export interface TodayItem {
  task: Task;
  completed: boolean;
}

export function getTodayTasks(
  tasks: Task[],
  completedIds: ReadonlySet<string>,
  date: Date,
): TodayItem[] {
  return tasks
    .filter((t) => isTaskScheduledOn(t, date))
    .map((task) => ({ task, completed: completedIds.has(task.id) }));
}

export function countProgress(items: TodayItem[]): {
  done: number;
  total: number;
  allDone: boolean;
} {
  const total = items.length;
  const done = items.filter((i) => i.completed).length;
  return { done, total, allDone: total > 0 && done === total };
}
