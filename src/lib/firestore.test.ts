import { describe, expect, it } from 'vitest';
import { paths } from './firestore';

describe('firestore paths', () => {
  const uid = 'parent-abc';

  it('scopes all data under users/{uid}', () => {
    expect(paths.tasks(uid)).toBe('users/parent-abc/tasks');
    expect(paths.adhoc(uid)).toBe('users/parent-abc/adhoc');
    expect(paths.completions(uid)).toBe('users/parent-abc/completions');
    expect(paths.settings(uid)).toBe('users/parent-abc/meta/settings');
  });
});
