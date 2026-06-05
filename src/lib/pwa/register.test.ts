import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerSW } from './register';

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

    const register = vi.fn();
    await registerSW(register);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ immediate: true });
  });

  it('skips registration in development', async () => {
    vi.stubEnv('PROD', false);
    const register = vi.fn();
    await registerSW(register);
    expect(register).not.toHaveBeenCalled();
  });
});
