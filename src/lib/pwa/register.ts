/**
 * 移除舊版 PWA service worker 與快取。
 * 不加 SW 攔截請求，讓手機一般重新整理就能拿到最新版。
 */
export async function clearLegacyPwaCaches(): Promise<void> {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((reg) => reg.unregister()));

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}
