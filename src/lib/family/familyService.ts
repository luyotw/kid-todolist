import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../firebase';
import { newId } from '../ids';
import { DEFAULT_CHILD_ID } from './childId';
import {
  INVITE_MAX_USES,
  INVITE_TTL_MS,
} from './constants';
import { validateInviteTokenDoc, type InviteErrorCode } from './inviteValidation';
import { familyPaths } from './paths';
import type {
  FamilyMember,
  FamilyProfile,
  InviteTokenDoc,
  UserMembership,
} from './types';

export type FamilyResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; code: InviteErrorCode };

export type AcceptInviteResult =
  | { ok: true; code: 'JOINED'; familyId: string }
  | { ok: true; code: 'ALREADY_MEMBER'; familyId: string }
  | { ok: false; code: InviteErrorCode };

export type CreateFamilyResult =
  | { ok: true; familyId: string; token: string }
  | { ok: false; code: InviteErrorCode };

type FirestoreDb = Firestore;

async function readMembershipDoc(
  firestore: FirestoreDb,
  uid: string,
): Promise<UserMembership | null> {
  const snap = await getDoc(doc(firestore, familyPaths.membership(uid)));
  return snap.exists() ? (snap.data() as UserMembership) : null;
}

async function readInviteTokenDoc(
  firestore: FirestoreDb,
  token: string,
): Promise<InviteTokenDoc | null> {
  const snap = await getDoc(doc(firestore, familyPaths.inviteToken(token)));
  return snap.exists() ? (snap.data() as InviteTokenDoc) : null;
}

async function isFamilyMemberOf(
  firestore: FirestoreDb,
  familyId: string,
  uid: string,
): Promise<boolean> {
  const snap = await getDoc(doc(firestore, familyPaths.member(familyId, uid)));
  return snap.exists();
}

export async function getMembership(
  uid: string,
  firestore: FirestoreDb = db,
): Promise<UserMembership | null> {
  return readMembershipDoc(firestore, uid);
}

export async function createFamily(
  uid: string,
  firestore: FirestoreDb = db,
): Promise<CreateFamilyResult> {
  const existing = await readMembershipDoc(firestore, uid);
  if (existing) {
    return { ok: false, code: 'ALREADY_HAS_FAMILY' };
  }

  const familyId = newId();
  const now = Date.now();
  const profile: FamilyProfile = {
    createdAt: now,
    createdByUid: uid,
    defaultChildId: DEFAULT_CHILD_ID,
  };
  const member: FamilyMember = {
    role: 'owner',
    joinedAt: now,
  };
  const membership: UserMembership = {
    familyId,
    activeChildId: DEFAULT_CHILD_ID,
  };

  try {
    await runTransaction(firestore, async (tx) => {
      const membershipRef = doc(firestore, familyPaths.membership(uid));
      const membershipSnap = await tx.get(membershipRef);
      if (membershipSnap.exists()) {
        throw new Error('ALREADY_HAS_FAMILY');
      }
      tx.set(doc(firestore, familyPaths.profile(familyId)), profile);
      tx.set(doc(firestore, familyPaths.member(familyId, uid)), member);
      tx.set(membershipRef, membership);
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'ALREADY_HAS_FAMILY') {
      return { ok: false, code: 'ALREADY_HAS_FAMILY' };
    }
    throw err;
  }

  const tokenResult = await createInviteToken(uid, familyId, firestore);
  if (!tokenResult.ok) {
    return { ok: false, code: tokenResult.code };
  }

  return { ok: true, familyId, token: tokenResult.token };
}

export async function createInviteToken(
  uid: string,
  familyId: string,
  firestore: FirestoreDb = db,
): Promise<{ ok: true; token: string } | { ok: false; code: InviteErrorCode }> {
  const isMember = await isFamilyMemberOf(firestore, familyId, uid);
  if (!isMember) {
    return { ok: false, code: 'NOT_A_MEMBER' };
  }

  const token = newId();
  const now = Date.now();
  const inviteDoc: InviteTokenDoc = {
    familyId,
    createdAt: now,
    createdByUid: uid,
    expiresAt: now + INVITE_TTL_MS,
    maxUses: INVITE_MAX_USES,
    usedCount: 0,
  };

  await setDoc(doc(firestore, familyPaths.inviteToken(token)), inviteDoc);
  return { ok: true, token };
}

export async function acceptInvite(
  uid: string,
  token: string,
  options: { online?: boolean; firestore?: FirestoreDb; now?: number } = {},
): Promise<AcceptInviteResult> {
  const firestore = options.firestore ?? db;
  const now = options.now ?? Date.now();
  const online = options.online ?? true;

  if (!online) {
    return { ok: false, code: 'OFFLINE' };
  }

  const inviteDoc = await readInviteTokenDoc(firestore, token);
  const membership = await readMembershipDoc(firestore, uid);

  if (!inviteDoc) {
    return { ok: false, code: 'NOT_FOUND' };
  }

  if (membership?.familyId === inviteDoc.familyId) {
    return { ok: true, code: 'ALREADY_MEMBER', familyId: inviteDoc.familyId };
  }

  if (membership && membership.familyId !== inviteDoc.familyId) {
    return { ok: false, code: 'OTHER_FAMILY' };
  }

  const validation = validateInviteTokenDoc(inviteDoc, now);
  if (!validation.ok) {
    return { ok: false, code: validation.code };
  }

  const { familyId } = inviteDoc;
  const member: FamilyMember = {
    role: 'parent',
    joinedAt: now,
  };
  const newMembership: UserMembership = {
    familyId,
    activeChildId: DEFAULT_CHILD_ID,
  };

  try {
    await runTransaction(firestore, async (tx) => {
      const tokenRef = doc(firestore, familyPaths.inviteToken(token));
      const tokenSnap = await tx.get(tokenRef);
      if (!tokenSnap.exists()) {
        throw new Error('NOT_FOUND');
      }
      const current = tokenSnap.data() as InviteTokenDoc;
      const check = validateInviteTokenDoc(current, now);
      if (!check.ok) {
        throw new Error(check.code);
      }

      const membershipRef = doc(firestore, familyPaths.membership(uid));
      const membershipSnap = await tx.get(membershipRef);
      if (membershipSnap.exists()) {
        const existing = membershipSnap.data() as UserMembership;
        if (existing.familyId === familyId) {
          throw new Error('ALREADY_MEMBER');
        }
        throw new Error('OTHER_FAMILY');
      }

      tx.set(doc(firestore, familyPaths.member(familyId, uid)), member);
      tx.set(membershipRef, newMembership);
      tx.update(tokenRef, { usedCount: current.usedCount + 1 });
    });
  } catch (err: unknown) {
    const code =
      err instanceof Error &&
      [
        'NOT_FOUND',
        'EXPIRED',
        'EXHAUSTED',
        'ALREADY_MEMBER',
        'OTHER_FAMILY',
      ].includes(err.message)
        ? (err.message as InviteErrorCode)
        : null;
    if (code === 'ALREADY_MEMBER') {
      return { ok: true, code: 'ALREADY_MEMBER', familyId };
    }
    if (code) {
      return { ok: false, code };
    }
    throw err;
  }

  return { ok: true, code: 'JOINED', familyId };
}
