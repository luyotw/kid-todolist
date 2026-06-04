import { describe, expect, it, vi } from 'vitest';
import { firestoreReadError } from './firestoreErrors';

describe('firestoreReadError', () => {
  it('returns generic message without error detail in production-like env', () => {
    expect(firestoreReadError('任務')).toBe('讀取任務失敗。');
  });

  it('hints emulator when permission-denied in dev', () => {
    const err = Object.assign(new Error('denied'), { code: 'permission-denied' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const msg = firestoreReadError('任務', err);
    expect(msg).toMatch(/dev:local|firestore\.rules/);
    spy.mockRestore();
  });
});
