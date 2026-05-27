import { describe, expect, it } from 'vitest';
import { storage } from './storage';

describe('storage', () => {
  it('returns fallback when key is missing', () => {
    expect(storage.get('missing', { hello: 'world' })).toEqual({
      hello: 'world',
    });
  });

  it('round-trips a value through set/get', () => {
    storage.set('tasks', [{ id: '1', title: '刷牙' }]);
    expect(storage.get('tasks', [])).toEqual([{ id: '1', title: '刷牙' }]);
  });

  it('returns fallback when stored JSON is corrupt', () => {
    window.localStorage.setItem('broken', '{not json');
    expect(storage.get('broken', 'default')).toBe('default');
  });

  it('removes a key', () => {
    storage.set('temp', 1);
    storage.remove('temp');
    expect(storage.get('temp', null)).toBeNull();
  });
});
