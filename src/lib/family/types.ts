export type FamilyRole = 'owner' | 'parent';

export interface FamilyProfile {
  createdAt: number;
  createdByUid: string;
  defaultChildId: string;
}

export interface FamilyMember {
  role: FamilyRole;
  joinedAt: number;
}

/** 供 #37 邀請流程使用；本 issue 僅定義欄位骨架。 */
export interface FamilyInvite {
  createdAt: number;
  createdByUid: string;
}

export interface UserMembership {
  familyId: string;
  activeChildId: string;
}
