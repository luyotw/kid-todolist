import { describe, expect, it } from 'vitest';
import { mergeSyncMeta, readySync } from './cloudSync';

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
});
