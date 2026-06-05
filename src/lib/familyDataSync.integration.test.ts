// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { familyPaths } from './family/paths';
import {
  acceptInvite,
  createFamily,
} from './family/familyService';

const PROJECT_ID = 'kid-todolist-family-data-sync-test';
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
});

function dbFor(uid: string): Firestore {
  return testEnv.authenticatedContext(uid).firestore() as unknown as Firestore;
}

describe('family data sync integration', () => {
  it('lets two members read the same family task data', async () => {
    const ownerDb = dbFor('owner');
    const created = await createFamily('owner', ownerDb);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await setDoc(doc(ownerDb, `${familyPaths.tasks(created.familyId)}/task-1`), {
      title: '共享任務',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      createdAt: 1,
    });

    const joinerDb = dbFor('joiner');
    const joined = await acceptInvite('joiner', created.token, {
      firestore: joinerDb,
    });
    expect(joined.ok).toBe(true);

    const joinerTasks = await getDocs(
      collection(joinerDb, familyPaths.tasks(created.familyId)),
    );
    expect(joinerTasks.docs.map((d) => d.data().title)).toEqual(['共享任務']);

    const ownerTasks = await getDocs(
      collection(ownerDb, familyPaths.tasks(created.familyId)),
    );
    expect(ownerTasks.docs[0]?.id).toBe(joinerTasks.docs[0]?.id);
  });
});
