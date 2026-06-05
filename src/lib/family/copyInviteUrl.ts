export type CopyInviteResult = 'copied' | 'prompted';

/** 複製邀請連結；clipboard 不可用時以 prompt 讓使用者手動複製。 */
export async function copyInviteUrl(url: string): Promise<CopyInviteResult> {
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('複製邀請連結：', url);
    return 'prompted';
  }
}
