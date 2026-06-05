export type FamilyRole = 'owner' | 'parent';

export interface FamilyProfile {
  createdAt: number;
  createdByUid: string;
  defaultChildId: string;
}

export interface FamilyMember {
  role: FamilyRole;
  joinedAt: number;
  /** 加入時寫入，供 rules 驗證 inviteTokens；owner 建立家庭時省略。 */
  inviteToken?: string;
}

/** 供 #37 邀請流程使用；本 issue 僅定義欄位骨架。 */
export interface FamilyInvite {
  createdAt: number;
  createdByUid: string;
}

/** 頂層 inviteTokens/{token} 文件。 */
export interface InviteTokenDoc {
  familyId: string;
  createdAt: number;
  createdByUid: string;
  expiresAt: number;
  maxUses: number;
  usedCount: number;
}

export interface UserMembership {
  familyId: string;
  activeChildId: string;
}
