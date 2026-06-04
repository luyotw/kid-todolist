import type { InviteTokenDoc } from './types';

export type InviteErrorCode =
  | 'EXPIRED'
  | 'EXHAUSTED'
  | 'NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'OTHER_FAMILY'
  | 'OFFLINE'
  | 'ALREADY_HAS_FAMILY'
  | 'NOT_A_MEMBER';

export const INVITE_USER_MESSAGES: Record<
  Exclude<InviteErrorCode, 'JOINED'> | 'JOINED',
  string
> = {
  EXPIRED: '連結已失效，請向家庭成員索取新連結',
  EXHAUSTED: '連結已被使用，請索取新連結',
  NOT_FOUND: '連結無效',
  ALREADY_MEMBER: '你已在這個家庭',
  OTHER_FAMILY: '無法加入，你已屬於其他家庭',
  OFFLINE: '需連上網路後再試',
  ALREADY_HAS_FAMILY: '你已經有家庭了',
  NOT_A_MEMBER: '你不是這個家庭的成員',
  JOINED: '已加入家庭',
};

export type InviteValidationResult =
  | { ok: true }
  | { ok: false; code: InviteErrorCode };

/** 驗證 invite token 文件是否仍可接受新成員。 */
export function validateInviteTokenDoc(
  doc: InviteTokenDoc | null | undefined,
  now: number = Date.now(),
): InviteValidationResult {
  if (!doc) {
    return { ok: false, code: 'NOT_FOUND' };
  }
  if (doc.expiresAt <= now) {
    return { ok: false, code: 'EXPIRED' };
  }
  if (doc.usedCount >= doc.maxUses) {
    return { ok: false, code: 'EXHAUSTED' };
  }
  return { ok: true };
}
