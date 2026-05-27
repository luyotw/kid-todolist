import type { AdhocTask, Task } from '../types';
import { isTaskScheduledOn } from './schedule';

export interface TodayItem {
  // Stable id used for completion tracking & React keys.
  id: string;
  title: string;
  completed: boolean;
  source: 'task' | 'adhoc';
}

export function getTodayTasks(
  tasks: Task[],
  completedIds: ReadonlySet<string>,
  date: Date,
): TodayItem[] {
  return tasks
    .filter((t) => isTaskScheduledOn(t, date))
    .map((task) => ({
      id: task.id,
      title: task.title,
      completed: completedIds.has(task.id),
      source: 'task' as const,
    }));
}

export function buildTodayItems(
  tasks: Task[],
  adhoc: AdhocTask[],
  completedIds: ReadonlySet<string>,
  date: Date,
): TodayItem[] {
  const scheduled = getTodayTasks(tasks, completedIds, date);
  const adhocItems: TodayItem[] = adhoc.map((a) => ({
    id: a.id,
    title: a.title,
    completed: completedIds.has(a.id),
    source: 'adhoc',
  }));
  return [...scheduled, ...adhocItems];
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
