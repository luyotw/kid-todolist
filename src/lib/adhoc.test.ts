import { describe, expect, it } from 'vitest';
import { createAdhoc, deleteAdhoc, getAdhocFor } from './adhoc';
import type { AdhocTask } from '../types';

const seed: AdhocTask = {
  id: 'a',
  title: '今天去學校簽聯絡簿',
  date: '2026-01-05',
  createdAt: 0,
};

describe('createAdhoc', () => {
  it('adds a one-off task tagged to the given date', () => {
    const result = createAdhoc([], '  寄包裹  ', '2026-01-06', 2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: '寄包裹',
      date: '2026-01-06',
      points: 2,
    });
  });

  it('allows zero-point one-off tasks', () => {
    const result = createAdhoc([], '澆花', '2026-01-06', 0);
    expect(result[0].points).toBe(0);
  });

  it('ignores empty titles', () => {
    expect(createAdhoc([seed], '   ', '2026-01-05')).toEqual([seed]);
  });
});

describe('deleteAdhoc', () => {
  it('removes by id', () => {
    expect(deleteAdhoc([seed], 'a')).toEqual([]);
    expect(deleteAdhoc([seed], 'zzz')).toEqual([seed]);
  });
});

describe('getAdhocFor', () => {
  it('only returns tasks matching the date', () => {
    const other: AdhocTask = {
      id: 'b',
      title: '明天',
      date: '2026-01-06',
      createdAt: 0,
    };
    expect(getAdhocFor([seed, other], '2026-01-05')).toEqual([seed]);
    expect(getAdhocFor([seed, other], '2026-01-06')).toEqual([other]);
    expect(getAdhocFor([seed, other], '2026-01-07')).toEqual([]);
  });
});
