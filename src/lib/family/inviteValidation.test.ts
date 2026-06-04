import { describe, expect, it } from 'vitest';
import { validateInviteTokenDoc } from './inviteValidation';
import type { InviteTokenDoc } from './types';

const baseDoc = (): InviteTokenDoc => ({
  familyId: 'fam-1',
  createdAt: 1_000,
  createdByUid: 'owner',
  expiresAt: 10_000,
  maxUses: 5,
  usedCount: 0,
});

describe('validateInviteTokenDoc', () => {
  it('accepts a fresh token', () => {
    expect(validateInviteTokenDoc(baseDoc(), 5_000)).toEqual({ ok: true });
  });

  it('returns EXPIRED when expiresAt <= now', () => {
    const result = validateInviteTokenDoc(baseDoc(), 10_000);
    expect(result).toEqual({ ok: false, code: 'EXPIRED' });
  });

  it('returns EXHAUSTED when usedCount >= maxUses', () => {
    const doc = { ...baseDoc(), usedCount: 5 };
    expect(validateInviteTokenDoc(doc, 5_000)).toEqual({
      ok: false,
      code: 'EXHAUSTED',
    });
  });

  it('returns NOT_FOUND for a missing doc', () => {
    expect(validateInviteTokenDoc(null)).toEqual({
      ok: false,
      code: 'NOT_FOUND',
    });
  });
});
