// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { INVITE_MAX_USES } from './constants';
import {
  acceptInvite,
  createFamily,
  createInviteToken,
  getMembership,
} from './familyService';
import type { InviteTokenDoc } from './types';

const PROJECT_ID = 'kid-todolist-family-invite-test';
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

describe('family invite integration', () => {
  it('lets a second user join the same family via invite token', async () => {
    const ownerDb = dbFor('owner');
    const created = await createFamily('owner', ownerDb);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const joinerDb = dbFor('joiner');
    const joined = await acceptInvite('joiner', created.token, {
      firestore: joinerDb,
    });
    expect(joined).toEqual({
      ok: true,
      code: 'JOINED',
      familyId: created.familyId,
    });

    const ownerMembership = await getMembership('owner', ownerDb);
    const joinerMembership = await getMembership('joiner', joinerDb);
    expect(ownerMembership?.familyId).toBe(created.familyId);
    expect(joinerMembership).toEqual({
      familyId: created.familyId,
      activeChildId: '_default',
    });
  });

  it('returns EXHAUSTED after max successful joins', async () => {
    const ownerDb = dbFor('owner');
    const created = await createFamily('owner', ownerDb);
    if (!created.ok) throw new Error('setup failed');

    for (let i = 0; i < INVITE_MAX_USES; i += 1) {
      const uid = `joiner-${i}`;
      const result = await acceptInvite(uid, created.token, {
        firestore: dbFor(uid),
      });
      expect(result.ok).toBe(true);
      if (result.ok && result.code !== 'JOINED') {
        throw new Error(`expected JOINED, got ${result.code}`);
      }
    }

    const extra = await acceptInvite('joiner-extra', created.token, {
      firestore: dbFor('joiner-extra'),
    });
    expect(extra).toEqual({ ok: false, code: 'EXHAUSTED' });
    expect(await getMembership('joiner-extra', dbFor('joiner-extra'))).toBeNull();
  });

  it('returns ALREADY_MEMBER without consuming token uses', async () => {
    const ownerDb = dbFor('owner');
    const created = await createFamily('owner', ownerDb);
    if (!created.ok) throw new Error('setup failed');

    const joinerDb = dbFor('joiner');
    await acceptInvite('joiner', created.token, { firestore: joinerDb });

    const again = await acceptInvite('joiner', created.token, {
      firestore: joinerDb,
    });
    expect(again).toEqual({
      ok: true,
      code: 'ALREADY_MEMBER',
      familyId: created.familyId,
    });

    const tokenSnap = await getDoc(
      doc(ownerDb, `inviteTokens/${created.token}`),
    );
    const tokenData = tokenSnap.data() as InviteTokenDoc;
    expect(tokenData.usedCount).toBe(1);
  });

  it('blocks joining when user already belongs to another family', async () => {
    const ownerADb = dbFor('owner-a');
    const familyA = await createFamily('owner-a', ownerADb);
    if (!familyA.ok) throw new Error('setup A failed');

    const ownerBDb = dbFor('owner-b');
    const familyB = await createFamily('owner-b', ownerBDb);
    if (!familyB.ok) throw new Error('setup B failed');

    const tokenB = await createInviteToken('owner-b', familyB.familyId, ownerBDb);
    if (!tokenB.ok) throw new Error('token B failed');

    const blocked = await acceptInvite('owner-a', tokenB.token, {
      firestore: ownerADb,
    });
    expect(blocked).toEqual({ ok: false, code: 'OTHER_FAMILY' });
    expect(await getMembership('owner-a', ownerADb)).toEqual({
      familyId: familyA.familyId,
      activeChildId: '_default',
    });
  });
});
