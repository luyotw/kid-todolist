import { describe, expect, it } from 'vitest';
import { createTask, deleteTask, updateTask } from './tasks';
import type { Task } from '../types';

const seed: Task = { id: 'a', title: '刷牙', createdAt: 1 };

describe('createTask', () => {
  it('appends a new task with trimmed title', () => {
    const result = createTask([seed], '  寫功課  ');
    expect(result).toHaveLength(2);
    expect(result[1].title).toBe('寫功課');
    expect(result[1].id).not.toBe('a');
  });

  it('ignores empty or whitespace-only titles', () => {
    expect(createTask([seed], '')).toEqual([seed]);
    expect(createTask([seed], '   ')).toEqual([seed]);
  });
});

describe('updateTask', () => {
  it('updates title and trims it', () => {
    const result = updateTask([seed], 'a', { title: '  刷牙刷乾淨  ' });
    expect(result[0].title).toBe('刷牙刷乾淨');
  });

  it('ignores empty title updates', () => {
    const result = updateTask([seed], 'a', { title: '   ' });
    expect(result[0].title).toBe('刷牙');
  });

  it('leaves other tasks alone', () => {
    const other: Task = { id: 'b', title: '洗澡', createdAt: 2 };
    const result = updateTask([seed, other], 'a', { title: '刷牙好' });
    expect(result[1]).toBe(other);
  });
});

describe('deleteTask', () => {
  it('removes the matching task', () => {
    const other: Task = { id: 'b', title: '洗澡', createdAt: 2 };
    const result = deleteTask([seed, other], 'a');
    expect(result).toEqual([other]);
  });

  it('is a no-op when id is missing', () => {
    expect(deleteTask([seed], 'zzz')).toEqual([seed]);
  });
});
