import { describe, expect, it } from 'vitest';
import { countProgress, getTodayTasks } from './today';
import { ALL_WEEKDAYS, SCHOOL_DAYS, WEEKEND, type Task } from '../types';

const MON = new Date('2026-01-05T08:00:00'); // weekday 1
const SAT = new Date('2026-01-10T08:00:00'); // weekday 6

const t = (id: string, weekdays: Task['weekdays']): Task => ({
  id,
  title: id,
  weekdays,
  createdAt: 0,
});

describe('getTodayTasks', () => {
  it('returns only tasks scheduled today', () => {
    const tasks = [
      t('every', ALL_WEEKDAYS),
      t('school', SCHOOL_DAYS),
      t('weekend', WEEKEND),
    ];
    const monItems = getTodayTasks(tasks, new Set(), MON);
    expect(monItems.map((i) => i.task.id)).toEqual(['every', 'school']);

    const satItems = getTodayTasks(tasks, new Set(), SAT);
    expect(satItems.map((i) => i.task.id)).toEqual(['every', 'weekend']);
  });

  it('marks tasks as completed when their id is in the completion set', () => {
    const tasks = [t('a', ALL_WEEKDAYS), t('b', ALL_WEEKDAYS)];
    const items = getTodayTasks(tasks, new Set(['a']), MON);
    expect(items.find((i) => i.task.id === 'a')?.completed).toBe(true);
    expect(items.find((i) => i.task.id === 'b')?.completed).toBe(false);
  });

  it('uses date-specific completions: yesterday flips do not carry over', () => {
    const tasks = [t('a', ALL_WEEKDAYS)];
    // Mon completions = {a}; Tue completions = {} — same task, different days
    const monItems = getTodayTasks(tasks, new Set(['a']), MON);
    const tueItems = getTodayTasks(tasks, new Set(), new Date('2026-01-06T08:00:00'));
    expect(monItems[0].completed).toBe(true);
    expect(tueItems[0].completed).toBe(false);
  });
});

describe('countProgress', () => {
  it('returns 0/0 with allDone=false when there are no tasks', () => {
    expect(countProgress([])).toEqual({ done: 0, total: 0, allDone: false });
  });

  it('counts done/total and flags allDone only when all are checked', () => {
    const tasks = [t('a', ALL_WEEKDAYS), t('b', ALL_WEEKDAYS)];
    const partial = getTodayTasks(tasks, new Set(['a']), MON);
    expect(countProgress(partial)).toEqual({
      done: 1,
      total: 2,
      allDone: false,
    });
    const all = getTodayTasks(tasks, new Set(['a', 'b']), MON);
    expect(countProgress(all)).toEqual({ done: 2, total: 2, allDone: true });
  });
});
