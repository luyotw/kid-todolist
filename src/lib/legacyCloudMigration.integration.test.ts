// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { familyPaths } from './family/paths';
import { paths } from './firestore';
import {
  getMigrationFlag,
  maybeMigrateLegacyUserCloud,
} from './legacyCloudMigration';
import { createFamily } from './family/familyService';

const PROJECT_ID = 'kid-todolist-legacy-migration-test';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [firestoreHost, firestorePort] = FIRESTORE_EMULATOR_HOST.split(':');

let testEnv!: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: firestoreHost,
      port: Number(firestorePort),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: () => null,
    length: 0,
  };
  vi.stubGlobal('window', { localStorage });
  vi.stubGlobal('localStorage', localStorage);
});

function dbFor(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

describe('legacy user cloud migration integration', () => {
  it('copies legacy user tasks to family path on new family', async () => {
    const uid = 'legacy-owner';
    const ownerDb = dbFor(uid);

    await setDoc(doc(ownerDb, `${paths.tasks(uid)}/legacy-task`), {
      title: '舊版任務',
      weekdays: [0],
      createdAt: 1,
    });

    const created = await createFamily(uid, ownerDb);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await maybeMigrateLegacyUserCloud(
      uid,
      { familyId: created.familyId, activeChildId: '_default' },
      ownerDb,
    );

    const familyTasks = await getDocs(
      collection(ownerDb, familyPaths.tasks(created.familyId)),
    );
    expect(familyTasks.docs.map((d) => d.data().title)).toEqual(['舊版任務']);
    expect(getMigrationFlag(created.familyId)).toBe(true);
  });

  it('does not overwrite family data when another member already wrote tasks', async () => {
    const ownerDb = dbFor('owner');
    const created = await createFamily('owner', ownerDb);
    if (!created.ok) throw new Error('setup failed');

    await setDoc(
      doc(ownerDb, `${familyPaths.tasks(created.familyId)}/member-task`),
      {
        title: '成員既有任務',
        weekdays: [0],
        createdAt: 2,
      },
    );

    await setDoc(doc(ownerDb, `${paths.tasks('owner')}/legacy-task`), {
      title: '不應覆蓋',
      weekdays: [0],
      createdAt: 1,
    });

    await maybeMigrateLegacyUserCloud(
      'owner',
      { familyId: created.familyId, activeChildId: '_default' },
      ownerDb,
    );

    const familyTasks = await getDocs(
      collection(ownerDb, familyPaths.tasks(created.familyId)),
    );
    expect(familyTasks.docs.map((d) => d.data().title)).toEqual(['成員既有任務']);
    expect(getMigrationFlag(created.familyId)).toBe(false);
  });

  it('runs migration only once per family', async () => {
    const uid = 'once-user';
    const userDb = dbFor(uid);

    await setDoc(doc(userDb, `${paths.tasks(uid)}/legacy-task`), {
      title: '第一次',
      weekdays: [0],
      createdAt: 1,
    });

    const created = await createFamily(uid, userDb);
    if (!created.ok) throw new Error('setup failed');

    const membership = { familyId: created.familyId, activeChildId: '_default' };

    await maybeMigrateLegacyUserCloud(uid, membership, userDb);

    await setDoc(doc(userDb, `${paths.tasks(uid)}/legacy-task-2`), {
      title: '第二次',
      weekdays: [0],
      createdAt: 2,
    });

    await maybeMigrateLegacyUserCloud(uid, membership, userDb);

    const familyTasks = await getDocs(
      collection(userDb, familyPaths.tasks(created.familyId)),
    );
    expect(familyTasks.docs.map((d) => d.data().title)).toEqual(['第一次']);
  });
});
