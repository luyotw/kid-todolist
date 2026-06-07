import type { AdhocTask, Task } from '../types';
import { formatDate } from './date';
import { isTaskScheduledOn } from './schedule';
import type { TodayItem } from './today';

export interface OrderedItemKey {
  source: 'task' | 'adhoc';
  id: string;
}

export type DayOrders = Record<string, OrderedItemKey[]>;

function itemKey(key: OrderedItemKey): string {
  return `${key.source}:${key.id}`;
}

export function sortTasksByGlobalOrder(
  tasks: Task[],
  taskOrder?: string[],
): Task[] {
  if (!taskOrder?.length) {
    return [...tasks].sort((a, b) => a.createdAt - b.createdAt);
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const ordered: Task[] = [];
  const seen = new Set<string>();

  for (const id of taskOrder) {
    const task = byId.get(id);
    if (task) {
      ordered.push(task);
      seen.add(id);
    }
  }

  const rest = tasks
    .filter((t) => !seen.has(t.id))
    .sort((a, b) => a.createdAt - b.createdAt);
  return [...ordered, ...rest];
}

export function appendTaskToGlobalOrder(
  order: string[] | undefined,
  taskId: string,
): string[] {
  return [...(order ?? []), taskId];
}

export function removeTaskFromOrders(
  taskId: string,
  taskOrder?: string[],
  dayOrders?: DayOrders,
): { taskOrder: string[]; dayOrders: DayOrders } {
  const nextTaskOrder = (taskOrder ?? []).filter((id) => id !== taskId);
  const nextDayOrders: DayOrders = {};
  if (dayOrders) {
    for (const [date, keys] of Object.entries(dayOrders)) {
      const filtered = keys.filter(
        (k) => !(k.source === 'task' && k.id === taskId),
      );
      if (filtered.length > 0) {
        nextDayOrders[date] = filtered;
      }
    }
  }
  return { taskOrder: nextTaskOrder, dayOrders: nextDayOrders };
}

export function hasDayOverride(
  dayOrders: DayOrders | undefined,
  date: string,
): boolean {
  return Boolean(dayOrders?.[date]?.length);
}

export function clearDayOrder(
  dayOrders: DayOrders | undefined,
  date: string,
): DayOrders {
  if (!dayOrders) return {};
  const next = { ...dayOrders };
  delete next[date];
  return next;
}

export function setDayOrder(
  dayOrders: DayOrders | undefined,
  date: string,
  keys: OrderedItemKey[],
): DayOrders {
  return { ...(dayOrders ?? {}), [date]: keys };
}

export function appendAdhocToDayOrderIfOverride(
  dayOrders: DayOrders | undefined,
  date: string,
  adhocId: string,
): DayOrders {
  if (!hasDayOverride(dayOrders, date)) {
    return dayOrders ?? {};
  }
  return setDayOrder(dayOrders, date, [
    ...(dayOrders![date] ?? []),
    { source: 'adhoc', id: adhocId },
  ]);
}

function toTodayItem(
  key: OrderedItemKey,
  tasks: Task[],
  adhoc: AdhocTask[],
  completedIds: ReadonlySet<string>,
  date: Date,
): TodayItem | null {
  if (key.source === 'task') {
    const task = tasks.find((t) => t.id === key.id);
    if (!task || !isTaskScheduledOn(task, date)) return null;
    return {
      id: task.id,
      title: task.title,
      completed: completedIds.has(task.id),
      source: 'task',
    };
  }
  const item = adhoc.find((a) => a.id === key.id);
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    completed: completedIds.has(item.id),
    source: 'adhoc',
  };
}

function appendMissingItems(
  items: TodayItem[],
  seen: Set<string>,
  tasks: Task[],
  adhoc: AdhocTask[],
  completedIds: ReadonlySet<string>,
  date: Date,
): TodayItem[] {
  const next = [...items];
  const missingTasks = tasks
    .filter((t) => isTaskScheduledOn(t, date) && !seen.has(itemKey({ source: 'task', id: t.id })))
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const task of missingTasks) {
    next.push({
      id: task.id,
      title: task.title,
      completed: completedIds.has(task.id),
      source: 'task',
    });
    seen.add(itemKey({ source: 'task', id: task.id }));
  }

  const missingAdhoc = adhoc
    .filter((a) => !seen.has(itemKey({ source: 'adhoc', id: a.id })))
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const item of missingAdhoc) {
    next.push({
      id: item.id,
      title: item.title,
      completed: completedIds.has(item.id),
      source: 'adhoc',
    });
    seen.add(itemKey({ source: 'adhoc', id: item.id }));
  }

  return next;
}

export function buildOrderedTodayItems(
  tasks: Task[],
  adhoc: AdhocTask[],
  completedIds: ReadonlySet<string>,
  date: Date,
  taskOrder?: string[],
  dayOrders?: DayOrders,
): TodayItem[] {
  const dateStr = formatDate(date);
  const override = dayOrders?.[dateStr];

  if (override?.length) {
    const items: TodayItem[] = [];
    const seen = new Set<string>();

    for (const key of override) {
      const k = itemKey(key);
      if (seen.has(k)) continue;
      const item = toTodayItem(key, tasks, adhoc, completedIds, date);
      if (!item) continue;
      items.push(item);
      seen.add(k);
    }

    return appendMissingItems(items, seen, tasks, adhoc, completedIds, date);
  }

  const scheduled = sortTasksByGlobalOrder(
    tasks.filter((t) => isTaskScheduledOn(t, date)),
    taskOrder,
  ).map((task) => ({
    id: task.id,
    title: task.title,
    completed: completedIds.has(task.id),
    source: 'task' as const,
  }));

  const adhocItems = [...adhoc]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((item) => ({
      id: item.id,
      title: item.title,
      completed: completedIds.has(item.id),
      source: 'adhoc' as const,
    }));

  return [...scheduled, ...adhocItems];
}

export function normalizeTaskOrder(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return ids.length > 0 ? ids : undefined;
}

export function normalizeDayOrders(raw: unknown): DayOrders | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const next: DayOrders = {};
  for (const [date, keys] of Object.entries(raw)) {
    if (!Array.isArray(keys)) continue;
    const normalized = keys
      .filter(
        (k): k is OrderedItemKey =>
          typeof k === 'object' &&
          k !== null &&
          (k.source === 'task' || k.source === 'adhoc') &&
          typeof k.id === 'string' &&
          k.id.length > 0,
      );
    if (normalized.length > 0) {
      next[date] = normalized;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
