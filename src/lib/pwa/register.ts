/**
 * 移除舊版 PWA service worker 與快取。
 * 不加 SW 攔截請求，讓手機一般重新整理就能拿到最新版。
 * @returns 是否有清掉舊快取（需要 reload 一次才會載入新 JS）
 */
export async function clearLegacyPwaCaches(): Promise<boolean> {
  if (!import.meta.env.PROD) return false;
  if (!('serviceWorker' in navigator)) return false;

  let changed = false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length > 0) {
    await Promise.all(registrations.map((reg) => reg.unregister()));
    changed = true;
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => caches.delete(key)));
      changed = true;
    }
  }

  return changed;
}
