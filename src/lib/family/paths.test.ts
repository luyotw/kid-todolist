import { describe, expect, it } from 'vitest';
import { familyPaths } from './paths';

describe('familyPaths', () => {
  const familyId = 'fam-abc';
  const uid = 'parent-xyz';

  it('builds profile path under families/{id}/meta/profile', () => {
    expect(familyPaths.profile(familyId)).toBe('families/fam-abc/meta/profile');
  });

  it('builds member and invite paths', () => {
    expect(familyPaths.member(familyId, uid)).toBe(
      'families/fam-abc/members/parent-xyz',
    );
    expect(familyPaths.invite(familyId, 'token-1')).toBe(
      'families/fam-abc/invites/token-1',
    );
  });

  it('scopes child data under children/_default when childId omitted', () => {
    expect(familyPaths.tasks(familyId)).toBe(
      'families/fam-abc/children/_default/tasks',
    );
    expect(familyPaths.completions(familyId)).toBe(
      'families/fam-abc/children/_default/completions',
    );
    expect(familyPaths.adhoc(familyId)).toBe(
      'families/fam-abc/children/_default/adhoc',
    );
    expect(familyPaths.extraCompletions(familyId)).toBe(
      'families/fam-abc/children/_default/extraCompletions',
    );
    expect(familyPaths.extraAdhoc(familyId)).toBe(
      'families/fam-abc/children/_default/extraAdhoc',
    );
    expect(familyPaths.settings(familyId)).toBe(
      'families/fam-abc/children/_default/meta/settings',
    );
  });

  it('embeds explicit childId in child-scoped paths', () => {
    expect(familyPaths.tasks(familyId, 'kid-2')).toBe(
      'families/fam-abc/children/kid-2/tasks',
    );
  });

  it('builds membership index path under users/{uid}/meta/membership', () => {
    expect(familyPaths.membership(uid)).toBe('users/parent-xyz/meta/membership');
  });

  it('builds top-level invite token lookup path', () => {
    expect(familyPaths.inviteToken('tok-abc')).toBe('inviteTokens/tok-abc');
  });
});
