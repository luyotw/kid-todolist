import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearLegacyPwaCaches } from './register';

describe('clearLegacyPwaCaches', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('unregisters service workers and clears caches in production', async () => {
    vi.stubEnv('PROD', true);

    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi
      .fn()
      .mockResolvedValue([{ unregister }] as unknown as ServiceWorkerRegistration[]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const keys = vi.fn().mockResolvedValue(['workbox-precache-v2']);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: { getRegistrations } },
    });
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { keys, delete: deleteCache },
    });

    await expect(clearLegacyPwaCaches()).resolves.toBe(true);

    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(keys).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-v2');
  });

  it('returns false when nothing to clear', async () => {
    vi.stubEnv('PROD', true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([]) } },
    });
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { keys: vi.fn().mockResolvedValue([]), delete: vi.fn() },
    });

    await expect(clearLegacyPwaCaches()).resolves.toBe(false);
  });

  it('skips cleanup in development', async () => {
    vi.stubEnv('PROD', false);
    const getRegistrations = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: { getRegistrations } },
    });

    await expect(clearLegacyPwaCaches()).resolves.toBe(false);
    expect(getRegistrations).not.toHaveBeenCalled();
  });
});
