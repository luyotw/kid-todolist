import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { AdhocTask, Task } from '../types';
import type { CloudSyncPaths } from './cloudSyncTarget';
export type { CloudSyncPaths } from './cloudSyncTarget';
import { db } from './firebase';
import {
  listCollectionDocs,
  paths,
  readSingletonDoc,
  writeDoc,
  writeSingleton,
} from './firestore';
import type { ParentSettings } from './settings';
import { normalizeSettings } from './settings';

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

interface SettingsDoc {
  completionMessage?: string;
  rewards?: ParentSettings['rewards'];
  pointsBalance?: number;
  rewardText?: string;
  rewardCost?: number;
}

interface CompletionDay {
  id: string;
  ids?: string[];
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

function settingsFromDoc(data: SettingsDoc | null): ParentSettings {
  if (!data) return normalizeSettings(null);
  return normalizeSettings({
    completionMessage: data.completionMessage,
    rewards: data.rewards,
    pointsBalance: data.pointsBalance,
    rewardText: data.rewardText,
    rewardCost: data.rewardCost,
  });
}

export async function pushSnapshotToPaths(
  syncPaths: CloudSyncPaths,
  snapshot: LocalParentSnapshot,
  firestore: Firestore = db,
): Promise<void> {
  await Promise.all([
    ...snapshot.tasks.map((task) =>
      writeDoc(syncPaths.tasks, task.id, taskToFirestore(task), firestore),
    ),
    ...snapshot.adhoc.map((item) =>
      writeDoc(
        syncPaths.adhoc,
        item.id,
        {
          title: item.title,
          date: item.date,
          createdAt: item.createdAt,
        },
        firestore,
      ),
    ),
    ...Object.entries(snapshot.completions).flatMap(([dateStr, ids]) =>
      ids.length === 0
        ? []
        : [writeDoc(syncPaths.completions, dateStr, { ids }, firestore)],
    ),
    writeSingleton(syncPaths.settings, settingsToDoc(snapshot.settings), firestore),
  ]);
}

/** @deprecated 使用 pushSnapshotToPaths；保留供測試過渡。 */
export async function pushLocalSnapshotToCloud(
  syncPaths: CloudSyncPaths,
  snapshot: LocalParentSnapshot,
): Promise<void> {
  return pushSnapshotToPaths(syncPaths, snapshot);
}

export async function readLegacyUserCloudSnapshot(
  uid: string,
  firestore: Firestore = db,
): Promise<LocalParentSnapshot> {
  const [tasks, adhoc, completionDays, settingsDoc] = await Promise.all([
    listCollectionDocs<Task>(paths.tasks(uid), firestore),
    listCollectionDocs<AdhocTask>(paths.adhoc(uid), firestore),
    listCollectionDocs<CompletionDay>(paths.completions(uid), firestore),
    readSingletonDoc<SettingsDoc>(paths.settings(uid), firestore),
  ]);

  const completions: Record<string, string[]> = {};
  for (const day of completionDays) {
    completions[day.id] = day.ids ?? [];
  }

  return {
    tasks,
    adhoc,
    completions,
    settings: settingsFromDoc(settingsDoc),
  };
}
