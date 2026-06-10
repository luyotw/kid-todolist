import { describe, expect, it } from 'vitest';
import {
  applyCompletionDelta,
  applyRedemption,
  getTaskPoints,
  isScheduledTaskId,
  pointsShortfall,
} from './points';
import type { AdhocTask, Task } from '../types';
import { ALL_WEEKDAYS } from '../types';

const task = (id: string, points?: number): Task => ({
  id,
  title: 't',
  weekdays: ALL_WEEKDAYS,
  createdAt: 0,
  ...(points !== undefined ? { points } : {}),
});

describe('getTaskPoints', () => {
  it('defaults missing points to 0', () => {
    expect(getTaskPoints(task('a'))).toBe(0);
  });

  it('uses explicit points', () => {
    expect(getTaskPoints(task('a', 3))).toBe(3);
  });

  it('allows zero points', () => {
    expect(getTaskPoints(task('a', 0))).toBe(0);
  });
});

describe('applyCompletionDelta', () => {
  it('credits balance when completing', () => {
    expect(applyCompletionDelta(5, 3, true)).toBe(8);
  });

  it('debits balance when uncompleting', () => {
    expect(applyCompletionDelta(5, 3, false)).toBe(2);
  });

  it('floors balance at zero when debiting', () => {
    expect(applyCompletionDelta(1, 3, false)).toBe(0);
  });
});

describe('isScheduledTaskId', () => {
  const adhoc: AdhocTask[] = [
    { id: 'adhoc-1', title: 'x', date: '2026-01-01', createdAt: 0 },
  ];

  it('returns true for scheduled tasks', () => {
    expect(isScheduledTaskId([task('sched-1')], adhoc, 'sched-1')).toBe(true);
  });

  it('returns false for adhoc tasks', () => {
    expect(isScheduledTaskId([task('sched-1')], adhoc, 'adhoc-1')).toBe(false);
  });

  it('returns false for unknown ids', () => {
    expect(isScheduledTaskId([task('sched-1')], adhoc, 'missing')).toBe(false);
  });
});

describe('applyRedemption', () => {
  it('deducts cost when balance is sufficient', () => {
    expect(applyRedemption(5, 3)).toEqual({ ok: true, balance: 2 });
  });

  it('rejects redemption and reports shortfall when insufficient', () => {
    expect(applyRedemption(2, 3)).toEqual({
      ok: false,
      balance: 2,
      shortfall: 1,
    });
  });
});

describe('pointsShortfall', () => {
  it('returns zero when balance covers cost', () => {
    expect(pointsShortfall(5, 3)).toBe(0);
  });

  it('returns difference when balance is insufficient', () => {
    expect(pointsShortfall(2, 5)).toBe(3);
  });
});
