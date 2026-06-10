import type { AdhocTask } from '../types';
import { newId } from './ids';
import { normalizeTaskPoints } from './points';

export function createAdhoc(
  adhoc: AdhocTask[],
  title: string,
  date: string,
  points?: number,
): AdhocTask[] {
  const trimmed = title.trim();
  if (!trimmed) return adhoc;
  const task: AdhocTask = {
    id: newId(),
    title: trimmed,
    date,
    createdAt: Date.now(),
    ...(points !== undefined ? { points: normalizeTaskPoints(points) } : {}),
  };
  return [...adhoc, task];
}

export function deleteAdhoc(adhoc: AdhocTask[], id: string): AdhocTask[] {
  return adhoc.filter((a) => a.id !== id);
}

export function getAdhocFor(adhoc: AdhocTask[], date: string): AdhocTask[] {
  return adhoc.filter((a) => a.date === date);
}
