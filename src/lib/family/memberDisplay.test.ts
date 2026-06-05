import { describe, expect, it } from 'vitest';
import {
  formatMemberLabel,
  memberProfileFromAuth,
  roleLabel,
} from './memberDisplay';
import type { FamilyMember } from './types';

describe('formatMemberLabel', () => {
  const base: FamilyMember = { role: 'owner', joinedAt: 1 };

  it('prefers displayName over emailLocal and uid', () => {
    const member: FamilyMember = {
      ...base,
      displayName: '王小明',
      emailLocal: 'ming',
    };
    expect(formatMemberLabel(member, 'user-abcdefgh')).toBe('王小明');
  });

  it('falls back to emailLocal when displayName is missing', () => {
    const member: FamilyMember = { ...base, emailLocal: 'parent1' };
    expect(formatMemberLabel(member, 'user-abcdefgh')).toBe('parent1');
  });

  it('falls back to shortened uid when no profile fields', () => {
    expect(formatMemberLabel(base, 'user-abcdefgh')).toBe('user-abc…');
    expect(formatMemberLabel(base, 'short')).toBe('short');
  });
});

describe('roleLabel', () => {
  it('maps owner to 建立者 and parent to 家長', () => {
    expect(roleLabel('owner')).toBe('建立者');
    expect(roleLabel('parent')).toBe('家長');
  });
});

describe('memberProfileFromAuth', () => {
  it('extracts displayName and email local part', () => {
    expect(
      memberProfileFromAuth({
        displayName: ' 家長A ',
        email: 'parent@example.com',
      }),
    ).toEqual({
      displayName: '家長A',
      emailLocal: 'parent',
    });
  });
});
