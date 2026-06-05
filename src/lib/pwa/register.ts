type PwaRegister = (options?: { immediate?: boolean }) => void;

/**
 * 生產環境註冊 service worker（由 vite-plugin-pwa 注入虛擬模組）。
 */
export async function registerSW(
  registerFn?: PwaRegister,
): Promise<void> {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const register =
    registerFn ??
    (await import('virtual:pwa-register')).registerSW;
  register({ immediate: true });
}
