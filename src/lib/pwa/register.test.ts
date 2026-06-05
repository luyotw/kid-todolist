import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyPwaUpdate,
  registerSW,
  subscribePwaUpdate,
} from './register';

describe('registerSW', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls PWA register once in production when service worker is supported', async () => {
    vi.stubEnv('PROD', true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: {} },
    });

    const register = vi.fn(() => vi.fn());
    await registerSW(register);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ immediate: true }),
    );
  });

  it('skips registration in development', async () => {
    vi.stubEnv('PROD', false);
    const register = vi.fn();
    await registerSW(register);
    expect(register).not.toHaveBeenCalled();
  });

  it('notifies subscribers when onNeedRefresh fires', async () => {
    vi.stubEnv('PROD', true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: {} },
    });

    let onNeedRefresh: (() => void) | undefined;
    const register = vi.fn((options) => {
      onNeedRefresh = options?.onNeedRefresh;
      return vi.fn();
    });

    const listener = vi.fn();
    subscribePwaUpdate(listener);
    await registerSW(register);

    onNeedRefresh?.();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applyPwaUpdate calls update function with reload', async () => {
    vi.stubEnv('PROD', true);
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { serviceWorker: {} },
    });

    const update = vi.fn();
    const register = vi.fn(() => update);
    await registerSW(register);

    await applyPwaUpdate();
    expect(update).toHaveBeenCalledWith(true);
  });
});
