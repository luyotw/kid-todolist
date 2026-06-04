import { useEffect, useState } from 'react';
import type { AdhocTask, Task } from '../types';
import type { ParentSettings } from './settings';
import { paths, writeDoc, writeSingleton } from './firestore';

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

export interface LocalParentSnapshot {
  tasks: Task[];
  completions: Record<string, string[]>;
  adhoc: AdhocTask[];
  settings: ParentSettings;
}

export function isLocalSnapshotEmpty(snapshot: LocalParentSnapshot): boolean {
  return (
    snapshot.tasks.length === 0 &&
    snapshot.adhoc.length === 0 &&
    Object.keys(snapshot.completions).length === 0
  );
}

function taskToFirestore(task: Task) {
  return {
    title: task.title,
    weekdays: task.weekdays,
    createdAt: task.createdAt,
    ...(task.points !== undefined ? { points: task.points } : {}),
  };
}

function settingsToDoc(settings: ParentSettings) {
  return {
    completionMessage: settings.completionMessage,
    rewards: settings.rewards.map(({ id, title, cost, createdAt }) => ({
      id,
      title,
      cost,
      createdAt,
    })),
    pointsBalance: settings.pointsBalance,
  };
}

export async function pushLocalSnapshotToCloud(
  uid: string,
  snapshot: LocalParentSnapshot,
): Promise<void> {
  await Promise.all([
    ...snapshot.tasks.map((task) =>
      writeDoc(paths.tasks(uid), task.id, taskToFirestore(task)),
    ),
    ...snapshot.adhoc.map((item) =>
      writeDoc(paths.adhoc(uid), item.id, {
        title: item.title,
        date: item.date,
        createdAt: item.createdAt,
      }),
    ),
    ...Object.entries(snapshot.completions).flatMap(([dateStr, ids]) =>
      ids.length === 0
        ? []
        : [writeDoc(paths.completions(uid), dateStr, { ids })],
    ),
    writeSingleton(paths.settings(uid), settingsToDoc(snapshot.settings)),
  ]);
}
