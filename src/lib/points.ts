import type { AdhocTask, Task } from '../types';

export const DEFAULT_TASK_POINTS = 1;

export function normalizeTaskPoints(points: number): number {
  if (!Number.isFinite(points) || points < 1) return DEFAULT_TASK_POINTS;
  return Math.floor(points);
}

export function getTaskPoints(task: Pick<Task, 'points'>): number {
  if (task.points === undefined) return DEFAULT_TASK_POINTS;
  return normalizeTaskPoints(task.points);
}

export function isScheduledTaskId(
  tasks: Task[],
  adhoc: AdhocTask[],
  taskId: string,
): boolean {
  if (adhoc.some((a) => a.id === taskId)) return false;
  return tasks.some((t) => t.id === taskId);
}

export function applyCompletionDelta(
  balance: number,
  taskPoints: number,
  completing: boolean,
): number {
  if (completing) return balance + taskPoints;
  return Math.max(0, balance - taskPoints);
}

export function canRedeem(balance: number, cost: number): boolean {
  return balance >= normalizeTaskPoints(cost);
}

export type RedemptionResult =
  | { ok: true; balance: number }
  | { ok: false; balance: number; shortfall: number };

export function applyRedemption(
  balance: number,
  cost: number,
): RedemptionResult {
  const normalizedCost = normalizeTaskPoints(cost);
  if (balance < normalizedCost) {
    return { ok: false, balance, shortfall: normalizedCost - balance };
  }
  return { ok: true, balance: balance - normalizedCost };
}

export function pointsShortfall(balance: number, cost: number): number {
  const normalizedCost = normalizeTaskPoints(cost);
  return Math.max(0, normalizedCost - balance);
}
