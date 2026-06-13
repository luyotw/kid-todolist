import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  mergeSyncMeta,
  pushSnapshotToPaths,
  readySync,
  runCloudWrite,
  useOnlineStatus,
} from './cloudSync';
import * as firestore from './firestore';

vi.mock('./firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

describe('cloudSync', () => {
  it('mergeSyncMeta is ready only when every part is ready', () => {
    const merged = mergeSyncMeta(readySync, {
      ...readySync,
      ready: false,
      loading: true,
    });
    expect(merged.ready).toBe(false);
    expect(merged.loading).toBe(true);
  });

  it('mergeSyncMeta surfaces the first error', () => {
    const merged = mergeSyncMeta(readySync, {
      ...readySync,
      error: '儲存失敗',
    });
    expect(merged.error).toBe('儲存失敗');
  });

  it('useOnlineStatus reflects navigator.onLine changes', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);
  });

  it('runCloudWrite reports storage failures via callback', async () => {
    const onError = vi.fn();
    await runCloudWrite(async () => {
      throw new Error('boom');
    }, onError);
    expect(onError).toHaveBeenCalledWith('儲存失敗，請稍後再試。');
  });

  it('pushSnapshotToPaths writes to family paths', async () => {
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);

    await pushSnapshotToPaths(
      {
        tasks: 'families/fam-1/children/_default/tasks',
        completions: 'families/fam-1/children/_default/completions',
        adhoc: 'families/fam-1/children/_default/adhoc',
        extraCompletions: 'families/fam-1/children/_default/extraCompletions',
        extraAdhoc: 'families/fam-1/children/_default/extraAdhoc',
        settings: 'families/fam-1/children/_default/meta/settings',
      },
      {
        tasks: [
          {
            id: 't1',
            title: '刷牙',
            weekdays: [0, 1, 2, 3, 4, 5, 6],
            createdAt: 1,
          },
        ],
        adhoc: [],
        extraAdhoc: [],
        completions: { '2026-01-05': ['t1'] },
        extraCompletions: {},
        settings: {
          completionMessage: '棒',
          rewards: [],
          pointsBalance: 0,
        },
      },
    );

    expect(firestore.writeDoc).toHaveBeenCalledWith(
      'families/fam-1/children/_default/tasks',
      't1',
      expect.objectContaining({ title: '刷牙' }),
      expect.anything(),
    );
    expect(firestore.writeDoc).toHaveBeenCalledWith(
      'families/fam-1/children/_default/completions',
      '2026-01-05',
      { ids: ['t1'] },
      expect.anything(),
    );
    expect(firestore.writeSingleton).toHaveBeenCalledWith(
      'families/fam-1/children/_default/meta/settings',
      expect.objectContaining({ completionMessage: '棒' }),
      expect.anything(),
    );
  });

  it('pushSnapshotToPaths preserves adhoc points', async () => {
    vi.spyOn(firestore, 'writeDoc').mockResolvedValue(undefined);
    vi.spyOn(firestore, 'writeSingleton').mockResolvedValue(undefined);

    await pushSnapshotToPaths(
      {
        tasks: 'families/fam-1/children/_default/tasks',
        completions: 'families/fam-1/children/_default/completions',
        adhoc: 'families/fam-1/children/_default/adhoc',
        extraCompletions: 'families/fam-1/children/_default/extraCompletions',
        extraAdhoc: 'families/fam-1/children/_default/extraAdhoc',
        settings: 'families/fam-1/children/_default/meta/settings',
      },
      {
        tasks: [],
        adhoc: [
          {
            id: 'adhoc-1',
            title: '倒垃圾',
            date: '2026-01-05',
            createdAt: 1,
            points: 0,
          },
        ],
        extraAdhoc: [],
        completions: {},
        extraCompletions: {},
        settings: {
          completionMessage: '棒',
          rewards: [],
          pointsBalance: 0,
        },
      },
    );

    expect(firestore.writeDoc).toHaveBeenCalledWith(
      'families/fam-1/children/_default/adhoc',
      'adhoc-1',
      expect.objectContaining({ points: 0 }),
      expect.anything(),
    );
  });
});
