import type { FamilyMember, FamilyRole } from './types';

/** 建立／加入家庭時寫入成員文件的顯示名稱快照。 */
export interface MemberProfileSnapshot {
  displayName?: string;
  emailLocal?: string;
}

export function memberProfileFromAuth(user: {
  displayName?: string | null;
  email?: string | null;
}): MemberProfileSnapshot {
  const displayName = user.displayName?.trim();
  const emailLocal = user.email?.split('@')[0]?.trim();
  return {
    ...(displayName ? { displayName } : {}),
    ...(emailLocal ? { emailLocal } : {}),
  };
}

export function formatMemberLabel(member: FamilyMember, uid: string): string {
  if (member.displayName?.trim()) {
    return member.displayName.trim();
  }
  if (member.emailLocal?.trim()) {
    return member.emailLocal.trim();
  }
  return uid.length > 8 ? `${uid.slice(0, 8)}…` : uid;
}

export function roleLabel(role: FamilyRole): string {
  return role === 'owner' ? '建立者' : '家長';
}

export function memberDocWithProfile(
  base: FamilyMember,
  profile?: MemberProfileSnapshot,
): FamilyMember {
  if (!profile) return base;
  return {
    ...base,
    ...(profile.displayName ? { displayName: profile.displayName } : {}),
    ...(profile.emailLocal ? { emailLocal: profile.emailLocal } : {}),
  };
}
