import type { AdhocTask, Task } from '../types';
import { isTaskScheduledOn } from './schedule';
import {
  buildOrderedTodayItems,
  type DayOrders,
} from './taskOrder';

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
  taskOrder?: string[],
  dayOrders?: DayOrders,
): TodayItem[] {
  return buildOrderedTodayItems(
    tasks,
    adhoc,
    completedIds,
    date,
    taskOrder,
    dayOrders,
  );
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
