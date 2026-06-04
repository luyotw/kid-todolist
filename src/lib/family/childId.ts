/** MVP 固定小孩 id；路徑 helper 未指定 childId 時使用此值。 */
export const DEFAULT_CHILD_ID = '_default';

/** 將 childId 正規化：空值／空白 → `_default`；其餘 trim 後回傳。 */
export function normalizeChildId(childId?: string): string {
  if (childId === undefined || childId.trim() === '') {
    return DEFAULT_CHILD_ID;
  }
  return childId.trim();
}
