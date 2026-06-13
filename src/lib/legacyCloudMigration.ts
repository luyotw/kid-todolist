import {
  pushSnapshotToPaths,
  readLegacyUserCloudSnapshot,
  type CloudSyncPaths,
} from './cloudSync';
import { normalizeChildId } from './family/childId';
import { familyPaths } from './family/paths';
import type { UserMembership } from './family/types';
import type { Firestore } from 'firebase/firestore';
import { db } from './firebase';
import {
  isCollectionEmpty,
  paths,
  readSingletonDoc,
} from './firestore';
import { storage } from './storage';

const MIGRATION_FLAG_PREFIX = 'kid-todolist:legacy-migration:v1:';

export function migrationFlagKey(familyId: string): string {
  return `${MIGRATION_FLAG_PREFIX}${familyId}`;
}

export function getMigrationFlag(familyId: string): boolean {
  return storage.get<boolean>(migrationFlagKey(familyId), false);
}

export function setMigrationFlag(familyId: string): void {
  storage.set(migrationFlagKey(familyId), true);
}

export function shouldMigrateLegacyUserCloud(input: {
  hasMembership: boolean;
  legacyNonEmpty: boolean;
  familyChildEmpty: boolean;
  migrationFlagSet: boolean;
}): boolean {
  return (
    input.hasMembership &&
    input.legacyNonEmpty &&
    input.familyChildEmpty &&
    !input.migrationFlagSet
  );
}

export async function isLegacyUserCloudNonEmpty(
  uid: string,
  firestore: Firestore = db,
): Promise<boolean> {
  const [tasksEmpty, adhocEmpty, completionsEmpty, settings] = await Promise.all([
    isCollectionEmpty(paths.tasks(uid), firestore),
    isCollectionEmpty(paths.adhoc(uid), firestore),
    isCollectionEmpty(paths.completions(uid), firestore),
    readSingletonDoc<{ completionMessage?: string }>(paths.settings(uid), firestore),
  ]);

  if (!tasksEmpty || !adhocEmpty || !completionsEmpty) {
    return true;
  }
  return settings !== null;
}

export async function isFamilyChildCloudEmpty(
  familyId: string,
  childId?: string,
  firestore: Firestore = db,
): Promise<boolean> {
  const normalized = normalizeChildId(childId);
  const [tasksEmpty, adhocEmpty, completionsEmpty, settings] = await Promise.all([
    isCollectionEmpty(familyPaths.tasks(familyId, normalized), firestore),
    isCollectionEmpty(familyPaths.adhoc(familyId, normalized), firestore),
    isCollectionEmpty(familyPaths.completions(familyId, normalized), firestore),
    readSingletonDoc<{ completionMessage?: string }>(
      familyPaths.settings(familyId, normalized),
      firestore,
    ),
  ]);

  if (!tasksEmpty || !adhocEmpty || !completionsEmpty) {
    return false;
  }
  return settings === null;
}

export async function migrateLegacyUserCloudToFamily(
  uid: string,
  familyId: string,
  childId?: string,
  firestore: Firestore = db,
): Promise<void> {
  const normalized = normalizeChildId(childId);
  const snapshot = await readLegacyUserCloudSnapshot(uid, firestore);
  const targetPaths: CloudSyncPaths = {
    tasks: familyPaths.tasks(familyId, normalized),
    completions: familyPaths.completions(familyId, normalized),
    adhoc: familyPaths.adhoc(familyId, normalized),
    extraCompletions: familyPaths.extraCompletions(familyId, normalized),
    extraAdhoc: familyPaths.extraAdhoc(familyId, normalized),
    settings: familyPaths.settings(familyId, normalized),
  };
  await pushSnapshotToPaths(targetPaths, snapshot, firestore);
  setMigrationFlag(familyId);
}

/** 登入後若符合條件，一次性將 legacy user 雲端資料複製到家庭路徑。 */
export async function maybeMigrateLegacyUserCloud(
  uid: string,
  membership: UserMembership,
  firestore: Firestore = db,
): Promise<void> {
  const childId = normalizeChildId(membership.activeChildId);
  const migrationFlagSet = getMigrationFlag(membership.familyId);

  const [legacyNonEmpty, familyChildEmpty] = await Promise.all([
    isLegacyUserCloudNonEmpty(uid, firestore),
    isFamilyChildCloudEmpty(membership.familyId, childId, firestore),
  ]);

  if (
    !shouldMigrateLegacyUserCloud({
      hasMembership: true,
      legacyNonEmpty,
      familyChildEmpty,
      migrationFlagSet,
    })
  ) {
    return;
  }

  await migrateLegacyUserCloudToFamily(uid, membership.familyId, childId, firestore);
}
