type PwaRegister = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
}) => (reloadPage?: boolean) => Promise<void>;

type UpdateSW = (reloadPage?: boolean) => Promise<void>;

let updateSWFn: UpdateSW | null = null;
let refreshNeeded = false;
const listeners = new Set<() => void>();

function notifyUpdateNeeded() {
  refreshNeeded = true;
  for (const listener of listeners) {
    listener();
  }
}

/** 訂閱「有新版本」事件；若已偵測到更新會立即觸發。 */
export function subscribePwaUpdate(listener: () => void): () => void {
  listeners.add(listener);
  if (refreshNeeded) {
    listener();
  }
  return () => listeners.delete(listener);
}

/** 啟用等待中的 service worker 並重新載入頁面。 */
export async function applyPwaUpdate(): Promise<void> {
  await updateSWFn?.(true);
}

function watchForUpdates(registration: ServiceWorkerRegistration) {
  const check = () => void registration.update();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      check();
    }
  });

  window.setInterval(check, 60 * 60 * 1000);
}

/**
 * 生產環境註冊 service worker（由 vite-plugin-pwa 注入虛擬模組）。
 * 使用 prompt 模式：偵測到新版本時透過 subscribePwaUpdate 通知 UI。
 */
export async function registerSW(
  registerFn?: PwaRegister,
): Promise<void> {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const register =
    registerFn ??
    (await import('virtual:pwa-register')).registerSW;

  updateSWFn = register({
    immediate: true,
    onNeedRefresh() {
      notifyUpdateNeeded();
    },
    onRegistered(registration) {
      if (registration) {
        watchForUpdates(registration);
      }
    },
  });
}
