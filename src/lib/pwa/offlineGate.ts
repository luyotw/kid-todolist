export interface OfflineLoginGateInput {
  configured: boolean;
  user: unknown | null;
  online: boolean;
}

/** 未登入且離線時，不應提供 Google 登入（需先連線）。 */
export function shouldShowOfflineLoginHint({
  configured,
  user,
  online,
}: OfflineLoginGateInput): boolean {
  if (!configured) return false;
  if (user) return false;
  return !online;
}
