import { describe, expect, it } from 'vitest';
import {
  ALL_WEEKDAYS,
  SCHOOL_DAYS,
  type AdhocTask,
  type Task,
} from '../types';
import {
  appendAdhocToDayOrderIfOverride,
  appendTaskToGlobalOrder,
  buildOrderedTodayItems,
  clearDayOrder,
  hasDayOverride,
  normalizeDayOrders,
  normalizeTaskOrder,
  removeTaskFromOrders,
  sortTasksByGlobalOrder,
} from './taskOrder';

const MON = new Date('2026-01-05T08:00:00');

const t = (
  id: string,
  weekdays: Task['weekdays'],
  createdAt = 0,
): Task => ({
  id,
  title: id,
  weekdays,
  createdAt,
});

const a = (id: string, date: string, createdAt = 0): AdhocTask => ({
  id,
  title: id,
  date,
  createdAt,
});

describe('sortTasksByGlobalOrder', () => {
  it('orders known tasks by taskOrder', () => {
    const tasks = [t('b', ALL_WEEKDAYS, 2), t('a', ALL_WEEKDAYS, 1)];
    expect(sortTasksByGlobalOrder(tasks, ['a', 'b']).map((x) => x.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('appends tasks missing from taskOrder by createdAt', () => {
    const tasks = [
      t('b', ALL_WEEKDAYS, 2),
      t('a', ALL_WEEKDAYS, 1),
      t('c', ALL_WEEKDAYS, 3),
    ];
    expect(sortTasksByGlobalOrder(tasks, ['b']).map((x) => x.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('ignores ghost ids in taskOrder', () => {
    const tasks = [t('a', ALL_WEEKDAYS, 1), t('b', ALL_WEEKDAYS, 2)];
    expect(
      sortTasksByGlobalOrder(tasks, ['ghost', 'a', 'b']).map((x) => x.id),
    ).toEqual(['a', 'b']);
  });
});

describe('buildOrderedTodayItems', () => {
  it('uses global order for scheduled tasks then adhoc by createdAt', () => {
    const tasks = [t('b', ALL_WEEKDAYS, 2), t('a', ALL_WEEKDAYS, 1)];
    const adhoc = [a('x', '2026-01-05', 2), a('y', '2026-01-05', 1)];
    const items = buildOrderedTodayItems(
      tasks,
      adhoc,
      new Set(),
      MON,
      ['a', 'b'],
    );
    expect(items.map((i) => ({ id: i.id, source: i.source }))).toEqual([
      { id: 'a', source: 'task' },
      { id: 'b', source: 'task' },
      { id: 'y', source: 'adhoc' },
      { id: 'x', source: 'adhoc' },
    ]);
  });

  it('follows day override for mixed order', () => {
    const tasks = [t('a', ALL_WEEKDAYS), t('b', ALL_WEEKDAYS)];
    const adhoc = [a('x', '2026-01-05')];
    const items = buildOrderedTodayItems(
      tasks,
      adhoc,
      new Set(),
      MON,
      ['a', 'b'],
      {
        '2026-01-05': [
          { source: 'adhoc', id: 'x' },
          { source: 'task', id: 'b' },
          { source: 'task', id: 'a' },
        ],
      },
    );
    expect(items.map((i) => i.id)).toEqual(['x', 'b', 'a']);
  });

  it('omits unscheduled tasks from today override list', () => {
    const tasks = [t('school', SCHOOL_DAYS), t('every', ALL_WEEKDAYS)];
    const items = buildOrderedTodayItems(
      tasks,
      [],
      new Set(),
      MON,
      undefined,
      {
        '2026-01-05': [
          { source: 'task', id: 'school' },
          { source: 'task', id: 'every' },
        ],
      },
    );
    expect(items.map((i) => i.id)).toEqual(['school', 'every']);
  });

  it('appends new adhoc at end when day override exists', () => {
    const dayOrders = {
      '2026-01-05': [{ source: 'task' as const, id: 'a' }],
    };
    const next = appendAdhocToDayOrderIfOverride(dayOrders, '2026-01-05', 'x');
    expect(next['2026-01-05']).toEqual([
      { source: 'task', id: 'a' },
      { source: 'adhoc', id: 'x' },
    ]);
  });

  it('does not append adhoc to day order without override', () => {
    expect(
      appendAdhocToDayOrderIfOverride(undefined, '2026-01-05', 'x'),
    ).toEqual({});
  });

  it('keeps adhoc after scheduled tasks without override', () => {
    const tasks = [t('a', ALL_WEEKDAYS, 1)];
    const adhoc = [a('late', '2026-01-05', 5), a('early', '2026-01-05', 1)];
    const items = buildOrderedTodayItems(tasks, adhoc, new Set(), MON);
    expect(items.map((i) => i.id)).toEqual(['a', 'early', 'late']);
  });
});

describe('clearDayOrder', () => {
  it('removes override and restores default ordering', () => {
    const tasks = [t('b', ALL_WEEKDAYS, 2), t('a', ALL_WEEKDAYS, 1)];
    const adhoc = [a('x', '2026-01-05', 1)];
    const dayOrders = {
      '2026-01-05': [
        { source: 'adhoc' as const, id: 'x' },
        { source: 'task' as const, id: 'b' },
      ],
    };
    const cleared = clearDayOrder(dayOrders, '2026-01-05');
    expect(hasDayOverride(cleared, '2026-01-05')).toBe(false);
    const items = buildOrderedTodayItems(
      tasks,
      adhoc,
      new Set(),
      MON,
      ['a', 'b'],
      cleared,
    );
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'x']);
  });
});

describe('removeTaskFromOrders', () => {
  it('removes task from global and all day orders', () => {
    const result = removeTaskFromOrders('a', ['a', 'b'], {
      '2026-01-05': [
        { source: 'task', id: 'a' },
        { source: 'adhoc', id: 'x' },
      ],
      '2026-01-06': [{ source: 'task', id: 'a' }],
    });
    expect(result.taskOrder).toEqual(['b']);
    expect(result.dayOrders).toEqual({
      '2026-01-05': [{ source: 'adhoc', id: 'x' }],
    });
  });
});

describe('appendTaskToGlobalOrder', () => {
  it('appends new task id to the end', () => {
    expect(appendTaskToGlobalOrder(['a'], 'b')).toEqual(['a', 'b']);
    expect(appendTaskToGlobalOrder(undefined, 'a')).toEqual(['a']);
  });
});

describe('normalizeDayOrders', () => {
  it('retains past dates without pruning', () => {
    const raw = {
      '2020-01-01': [{ source: 'task', id: 'old' }],
      '2026-01-05': [{ source: 'adhoc', id: 'x' }],
    };
    expect(normalizeDayOrders(raw)).toEqual(raw);
  });
});

describe('normalizeTaskOrder', () => {
  it('filters invalid entries', () => {
    expect(normalizeTaskOrder(['a', '', 1 as unknown as string])).toEqual(['a']);
  });
});
