import { describe, expect, it } from 'vitest';
import { createTask, deleteTask, updateTask } from './tasks';
import { ALL_WEEKDAYS, SCHOOL_DAYS, type Task } from '../types';

const seed: Task = {
  id: 'a',
  title: '刷牙',
  weekdays: ALL_WEEKDAYS,
  createdAt: 1,
};

describe('createTask', () => {
  it('appends a new task with trimmed title and default every-day schedule', () => {
    const result = createTask([seed], '  寫功課  ');
    expect(result).toHaveLength(2);
    expect(result[1].title).toBe('寫功課');
    expect(result[1].id).not.toBe('a');
    expect(result[1].weekdays).toEqual(ALL_WEEKDAYS);
  });

  it('accepts a custom weekday list and dedupes/sorts it', () => {
    const result = createTask([], '寫功課', [3, 1, 1, 5]);
    expect(result[0].weekdays).toEqual([1, 3, 5]);
  });

  it('ignores empty or whitespace-only titles', () => {
    expect(createTask([seed], '')).toEqual([seed]);
    expect(createTask([seed], '   ')).toEqual([seed]);
  });

  it('stores normalized points when provided', () => {
    const result = createTask([], '寫功課', ALL_WEEKDAYS, 3);
    expect(result[0].points).toBe(3);
  });

  it('allows zero points', () => {
    const result = createTask([], '寫功課', ALL_WEEKDAYS, 0);
    expect(result[0].points).toBe(0);
  });
});

describe('updateTask', () => {
  it('updates title and trims it', () => {
    const result = updateTask([seed], 'a', { title: '  刷牙刷乾淨  ' });
    expect(result[0].title).toBe('刷牙刷乾淨');
  });

  it('updates weekdays and dedupes/sorts', () => {
    const result = updateTask([seed], 'a', { weekdays: [5, 1, 1] });
    expect(result[0].weekdays).toEqual([1, 5]);
  });

  it('ignores empty title updates', () => {
    const result = updateTask([seed], 'a', { title: '   ' });
    expect(result[0].title).toBe('刷牙');
  });

  it('leaves other tasks alone', () => {
    const other: Task = {
      id: 'b',
      title: '洗澡',
      weekdays: SCHOOL_DAYS,
      createdAt: 2,
    };
    const result = updateTask([seed, other], 'a', { title: '刷牙好' });
    expect(result[1]).toBe(other);
  });

  it('updates points and allows zero', () => {
    expect(updateTask([seed], 'a', { points: 5 })[0].points).toBe(5);
    expect(updateTask([seed], 'a', { points: 0 })[0].points).toBe(0);
  });
});

describe('deleteTask', () => {
  it('removes the matching task', () => {
    const other: Task = {
      id: 'b',
      title: '洗澡',
      weekdays: ALL_WEEKDAYS,
      createdAt: 2,
    };
    const result = deleteTask([seed, other], 'a');
    expect(result).toEqual([other]);
  });

  it('is a no-op when id is missing', () => {
    expect(deleteTask([seed], 'zzz')).toEqual([seed]);
  });
});
