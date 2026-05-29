import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mergeSyncMeta, readySync, runCloudWrite, useOnlineStatus } from './cloudSync';

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
});
