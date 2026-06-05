import { describe, expect, it } from 'vitest';
import { resolveCloudSyncTarget } from './cloudSyncTarget';

describe('resolveCloudSyncTarget', () => {
  it('is disabled without membership', () => {
    const target = resolveCloudSyncTarget(null);
    expect(target.enabled).toBe(false);
    expect(target.familyId).toBeUndefined();
    expect(target.paths.tasks).toBe('');
  });

  it('returns family paths when membership is present', () => {
    const target = resolveCloudSyncTarget({
      familyId: 'fam-abc',
      activeChildId: 'kid-1',
    });
    expect(target.enabled).toBe(true);
    expect(target.familyId).toBe('fam-abc');
    expect(target.childId).toBe('kid-1');
    expect(target.paths.tasks).toBe(
      'families/fam-abc/children/kid-1/tasks',
    );
    expect(target.paths.completions).toBe(
      'families/fam-abc/children/kid-1/completions',
    );
    expect(target.paths.adhoc).toBe(
      'families/fam-abc/children/kid-1/adhoc',
    );
    expect(target.paths.settings).toBe(
      'families/fam-abc/children/kid-1/meta/settings',
    );
  });

  it('normalizes missing activeChildId to _default', () => {
    const target = resolveCloudSyncTarget({
      familyId: 'fam-abc',
      activeChildId: '',
    });
    expect(target.childId).toBe('_default');
    expect(target.paths.tasks).toBe(
      'families/fam-abc/children/_default/tasks',
    );
  });
});
