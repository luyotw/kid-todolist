import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InviteTokenDoc, UserMembership } from './types';

const mockGetDoc = vi.fn();
const mockRunTransaction = vi.fn();
const mockWriteSingleton = vi.fn();

vi.mock('../firestore', () => ({}));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, path: string) => ({ path }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  setDoc: (...args: unknown[]) => mockWriteSingleton(...args),
}));

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('../ids', () => ({
  newId: vi.fn(() => 'generated-id'),
}));

import {
  acceptInvite,
  createFamily,
  createInviteToken,
} from './familyService';

function docSnap(exists: boolean, data?: unknown) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

describe('createFamily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      const tx = {
        get: vi.fn().mockResolvedValue(docSnap(false)),
        set: vi.fn(),
        update: vi.fn(),
      };
      await fn(tx);
      return tx;
    });
    mockWriteSingleton.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue(docSnap(true, { role: 'owner' }));
  });

  it('rejects when membership already exists', async () => {
    mockGetDoc.mockResolvedValueOnce(
      docSnap(true, { familyId: 'fam-old', activeChildId: '_default' }),
    );

    const result = await createFamily('user-1');
    expect(result).toEqual({ ok: false, code: 'ALREADY_HAS_FAMILY' });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('acceptInvite', () => {
  const token = 'tok-1';
  const inviteDoc: InviteTokenDoc = {
    familyId: 'fam-1',
    createdAt: 1,
    createdByUid: 'owner',
    expiresAt: Date.now() + 60_000,
    maxUses: 5,
    usedCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ALREADY_MEMBER without changing usedCount', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnap(true, inviteDoc))
      .mockResolvedValueOnce(
        docSnap(true, {
          familyId: 'fam-1',
          activeChildId: '_default',
        } satisfies UserMembership),
      );

    const result = await acceptInvite('user-2', token);
    expect(result).toEqual({
      ok: true,
      code: 'ALREADY_MEMBER',
      familyId: 'fam-1',
    });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns OTHER_FAMILY without writing membership', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnap(true, inviteDoc))
      .mockResolvedValueOnce(
        docSnap(true, {
          familyId: 'fam-other',
          activeChildId: '_default',
        }),
      );

    const result = await acceptInvite('user-2', token);
    expect(result).toEqual({ ok: false, code: 'OTHER_FAMILY' });
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('joins on happy path and increments usedCount in transaction', async () => {
    mockGetDoc
      .mockResolvedValueOnce(docSnap(true, inviteDoc))
      .mockResolvedValueOnce(docSnap(false));

    mockRunTransaction.mockImplementation(async (_db, fn) => {
      const tokenSnap = docSnap(true, inviteDoc);
      const tx = {
        get: vi.fn().mockResolvedValueOnce(tokenSnap).mockResolvedValueOnce(docSnap(false)),
        set: vi.fn(),
        update: vi.fn(),
      };
      await fn(tx);
      expect(tx.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: `inviteTokens/${token}` }),
        { usedCount: 1 },
      );
    });

    const result = await acceptInvite('user-2', token);
    expect(result).toEqual({ ok: true, code: 'JOINED', familyId: 'fam-1' });
  });
});

describe('createInviteToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteSingleton.mockResolvedValue(undefined);
  });

  it('writes invite token when user is a family member', async () => {
    mockGetDoc.mockResolvedValueOnce(docSnap(true, { role: 'owner' }));

    const result = await createInviteToken('owner', 'fam-1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.token).toBe('generated-id');
    }
    expect(mockWriteSingleton).toHaveBeenCalled();
  });
});
