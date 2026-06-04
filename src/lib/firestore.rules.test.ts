// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'kid-todolist-rules-test';
const RULES_PATH = resolve(process.cwd(), 'firestore.rules');
const FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const [firestoreHost, firestorePort] = FIRESTORE_EMULATOR_HOST.split(':');

let testEnv: RulesTestEnvironment | undefined;

async function seedFamilyMember(
  familyId: string,
  uid: string,
  role: 'owner' | 'parent' = 'owner',
) {
  await testEnv!.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `families/${familyId}/members/${uid}`), {
      role,
      joinedAt: Date.now(),
    });
  });
}

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
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv!.clearFirestore();
});

describe('Firestore security rules — family access', () => {
  it('allows family members to read and write family profile and child tasks', async () => {
    const familyId = 'fam-1';
    const uid = 'alice';
    await seedFamilyMember(familyId, uid);

    const alice = testEnv.authenticatedContext(uid);
    const db = alice.firestore();

    await assertSucceeds(
      setDoc(doc(db, `families/${familyId}/meta/profile`), {
        createdAt: 1,
        createdByUid: uid,
        defaultChildId: '_default',
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, `families/${familyId}/children/_default/tasks/t1`), {
        title: 'Brush teeth',
      }),
    );
    await assertSucceeds(getDoc(doc(db, `families/${familyId}/meta/profile`)));
  });

  it('denies non-members read and write on family data', async () => {
    const familyId = 'fam-1';
    await seedFamilyMember(familyId, 'alice');

    const bob = testEnv.authenticatedContext('bob');
    const db = bob.firestore();

    await assertFails(getDoc(doc(db, `families/${familyId}/meta/profile`)));
    await assertFails(
      setDoc(doc(db, `families/${familyId}/children/_default/tasks/t1`), {
        title: 'Nope',
      }),
    );
  });

  it('allows members to read and write invites', async () => {
    const familyId = 'fam-1';
    const uid = 'alice';
    await seedFamilyMember(familyId, uid);

    const alice = testEnv.authenticatedContext(uid);
    const db = alice.firestore();
    const inviteRef = doc(db, `families/${familyId}/invites/token-abc`);

    await assertSucceeds(
      setDoc(doc(db, `families/${familyId}/invites/token-abc`), {
        createdAt: 1,
        createdByUid: uid,
      }),
    );
    await assertSucceeds(getDoc(inviteRef));
  });

  it('allows users to read and write only their own membership doc', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const bob = testEnv.authenticatedContext('bob');

    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'users/alice/meta/membership'), {
        familyId: 'fam-1',
        activeChildId: '_default',
      }),
    );
    await assertFails(
      getDoc(doc(bob.firestore(), 'users/alice/meta/membership')),
    );
    await assertFails(
      setDoc(doc(bob.firestore(), 'users/alice/meta/membership'), {
        familyId: 'fam-1',
        activeChildId: '_default',
      }),
    );
  });

  it('preserves legacy user-scoped paths for authenticated owners', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const db = alice.firestore();

    await assertSucceeds(
      setDoc(doc(db, 'users/alice/tasks/t1'), { title: 'Legacy task' }),
    );
    await assertSucceeds(getDoc(doc(db, 'users/alice/tasks/t1')));
  });

  it('denies unauthenticated access to family and user paths', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    const db = unauthed.firestore();

    await assertFails(getDoc(doc(db, 'families/fam-1/meta/profile')));
    await assertFails(getDoc(doc(db, 'users/alice/meta/membership')));
    await assertFails(getDoc(doc(db, 'users/alice/tasks/t1')));
  });
});
