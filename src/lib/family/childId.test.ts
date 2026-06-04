import { describe, expect, it } from 'vitest';
import { DEFAULT_CHILD_ID, normalizeChildId } from './childId';

describe('normalizeChildId', () => {
  it('returns _default when undefined', () => {
    expect(normalizeChildId(undefined)).toBe(DEFAULT_CHILD_ID);
  });

  it('returns _default for empty or whitespace-only strings', () => {
    expect(normalizeChildId('')).toBe(DEFAULT_CHILD_ID);
    expect(normalizeChildId('   ')).toBe(DEFAULT_CHILD_ID);
  });

  it('keeps explicit _default unchanged', () => {
    expect(normalizeChildId('_default')).toBe('_default');
  });

  it('trims and preserves custom child ids', () => {
    expect(normalizeChildId('kid-2')).toBe('kid-2');
    expect(normalizeChildId('  kid-3  ')).toBe('kid-3');
  });
});
