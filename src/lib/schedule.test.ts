import { describe, expect, it } from 'vitest';
import { isTaskScheduledOn } from './schedule';
import {
  ALL_WEEKDAYS,
  SCHOOL_DAYS,
  WEEKEND,
  type Task,
} from '../types';

function makeTask(weekdays: Task['weekdays']): Task {
  return { id: 'x', title: 't', weekdays, createdAt: 0 };
}

// Reference dates with known weekdays
const SUN = new Date('2026-01-04T08:00:00'); // getDay() === 0
const MON = new Date('2026-01-05T08:00:00'); // 1
const WED = new Date('2026-01-07T08:00:00'); // 3
const SAT = new Date('2026-01-10T08:00:00'); // 6

describe('isTaskScheduledOn', () => {
  it('empty weekdays = never scheduled', () => {
    const task = makeTask([]);
    expect(isTaskScheduledOn(task, MON)).toBe(false);
    expect(isTaskScheduledOn(task, SAT)).toBe(false);
  });

  it('single-day task only triggers that day', () => {
    const task = makeTask([3]);
    expect(isTaskScheduledOn(task, WED)).toBe(true);
    expect(isTaskScheduledOn(task, MON)).toBe(false);
  });

  it('school-days task triggers Mon-Fri only', () => {
    const task = makeTask(SCHOOL_DAYS);
    expect(isTaskScheduledOn(task, MON)).toBe(true);
    expect(isTaskScheduledOn(task, WED)).toBe(true);
    expect(isTaskScheduledOn(task, SAT)).toBe(false);
    expect(isTaskScheduledOn(task, SUN)).toBe(false);
  });

  it('weekend task triggers Sat and Sun only', () => {
    const task = makeTask(WEEKEND);
    expect(isTaskScheduledOn(task, SUN)).toBe(true);
    expect(isTaskScheduledOn(task, SAT)).toBe(true);
    expect(isTaskScheduledOn(task, MON)).toBe(false);
  });

  it('every-day task triggers any day', () => {
    const task = makeTask(ALL_WEEKDAYS);
    for (const d of [SUN, MON, WED, SAT]) {
      expect(isTaskScheduledOn(task, d)).toBe(true);
    }
  });
});
