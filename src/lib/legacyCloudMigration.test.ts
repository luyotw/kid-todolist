import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMigrationFlag,
  migrationFlagKey,
  setMigrationFlag,
  shouldMigrateLegacyUserCloud,
} from './legacyCloudMigration';
import * as firestore from './firestore';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

describe('shouldMigrateLegacyUserCloud', () => {
  it('returns true when all gates pass', () => {
    expect(
      shouldMigrateLegacyUserCloud({
        hasMembership: true,
        legacyNonEmpty: true,
        familyChildEmpty: true,
        migrationFlagSet: false,
      }),
    ).toBe(true);
  });

  it('returns false when family child already has data', () => {
    expect(
      shouldMigrateLegacyUserCloud({
        hasMembership: true,
        legacyNonEmpty: true,
        familyChildEmpty: false,
        migrationFlagSet: false,
      }),
    ).toBe(false);
  });

  it('returns false when migration flag is set', () => {
    expect(
      shouldMigrateLegacyUserCloud({
        hasMembership: true,
        legacyNonEmpty: true,
        familyChildEmpty: true,
        migrationFlagSet: true,
      }),
    ).toBe(false);
  });

  it('returns false when legacy user cloud is empty', () => {
    expect(
      shouldMigrateLegacyUserCloud({
        hasMembership: true,
        legacyNonEmpty: false,
        familyChildEmpty: true,
        migrationFlagSet: false,
      }),
    ).toBe(false);
  });
});

describe('migration flag persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and reads migration flag by familyId', () => {
    expect(getMigrationFlag('fam-1')).toBe(false);
    setMigrationFlag('fam-1');
    expect(getMigrationFlag('fam-1')).toBe(true);
    expect(window.localStorage.getItem(migrationFlagKey('fam-1'))).toBeTruthy();
  });
});

describe('isLegacyUserCloudNonEmpty', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects legacy tasks collection', async () => {
    vi.spyOn(firestore, 'isCollectionEmpty').mockImplementation(async (path) => {
      if (path.includes('/tasks')) return false;
      return true;
    });
    vi.spyOn(firestore, 'readSingletonDoc').mockResolvedValue(null);

    const { isLegacyUserCloudNonEmpty } = await import('./legacyCloudMigration');
    expect(await isLegacyUserCloudNonEmpty('user-1')).toBe(true);
  });
});

describe('isFamilyChildCloudEmpty', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when family tasks exist', async () => {
    vi.spyOn(firestore, 'isCollectionEmpty').mockImplementation(async (path) => {
      if (path.includes('families/fam-1') && path.includes('/tasks')) {
        return false;
      }
      return true;
    });
    vi.spyOn(firestore, 'readSingletonDoc').mockResolvedValue(null);

    const { isFamilyChildCloudEmpty } = await import('./legacyCloudMigration');
    expect(await isFamilyChildCloudEmpty('fam-1')).toBe(false);
  });
});
