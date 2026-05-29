import { useEffect, useState } from 'react';

export interface CloudSyncMeta {
  loading: boolean;
  error: string | null;
  offline: boolean;
  ready: boolean;
}

export const readySync: CloudSyncMeta = {
  loading: false,
  error: null,
  offline: false,
  ready: true,
};

export const loadingSync: CloudSyncMeta = {
  loading: true,
  error: null,
  offline: false,
  ready: false,
};

export function mergeSyncMeta(...parts: CloudSyncMeta[]): CloudSyncMeta {
  return {
    loading: parts.some((p) => p.loading),
    error: parts.map((p) => p.error).find(Boolean) ?? null,
    offline: parts.some((p) => p.offline),
    ready: parts.every((p) => p.ready),
  };
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export async function runCloudWrite(
  fn: () => Promise<void>,
  onError: (message: string) => void,
): Promise<void> {
  try {
    await fn();
  } catch {
    onError('儲存失敗，請稍後再試。');
  }
}
