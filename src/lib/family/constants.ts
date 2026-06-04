/** 邀請連結預設有效期限：7 天。 */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 單一 token 在有效期內最多成功加入次數。 */
export const INVITE_MAX_USES = 5;

/** 登入前暫存 join token 的 localStorage key。 */
export const PENDING_JOIN_STORAGE_KEY = 'kid-todolist:pending-join-token:v1';
