import { normalizeChildId } from './childId';

/**
 * 家庭 Firestore 路徑 helper。
 * MVP 僅使用 childId `_default`；日後多小孩時新增 `children/{childId}` 並更新 membership.activeChildId。
 */
const familyRoot = (familyId: string) => `families/${familyId}`;

const childRoot = (familyId: string, childId?: string) =>
  `${familyRoot(familyId)}/children/${normalizeChildId(childId)}`;

export const familyPaths = {
  profile: (familyId: string) => `${familyRoot(familyId)}/meta/profile`,
  members: (familyId: string) => `${familyRoot(familyId)}/members`,
  member: (familyId: string, uid: string) =>
    `${familyRoot(familyId)}/members/${uid}`,
  invite: (familyId: string, token: string) =>
    `${familyRoot(familyId)}/invites/${token}`,
  tasks: (familyId: string, childId?: string) =>
    `${childRoot(familyId, childId)}/tasks`,
  completions: (familyId: string, childId?: string) =>
    `${childRoot(familyId, childId)}/completions`,
  adhoc: (familyId: string, childId?: string) =>
    `${childRoot(familyId, childId)}/adhoc`,
  settings: (familyId: string, childId?: string) =>
    `${childRoot(familyId, childId)}/meta/settings`,
  membership: (uid: string) => `users/${uid}/meta/membership`,
  inviteToken: (token: string) => `inviteTokens/${token}`,
};
