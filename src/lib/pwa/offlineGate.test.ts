import { describe, expect, it } from 'vitest';
import { shouldShowOfflineLoginHint } from './offlineGate';

describe('shouldShowOfflineLoginHint', () => {
  it('shows hint when configured, no user, and offline', () => {
    expect(
      shouldShowOfflineLoginHint({
        configured: true,
        user: null,
        online: false,
      }),
    ).toBe(true);
  });

  it('does not show hint when user is logged in', () => {
    expect(
      shouldShowOfflineLoginHint({
        configured: true,
        user: { uid: 'u1' },
        online: false,
      }),
    ).toBe(false);
  });

  it('does not show hint when firebase is unconfigured', () => {
    expect(
      shouldShowOfflineLoginHint({
        configured: false,
        user: null,
        online: false,
      }),
    ).toBe(false);
  });

  it('does not show hint when online', () => {
    expect(
      shouldShowOfflineLoginHint({
        configured: true,
        user: null,
        online: true,
      }),
    ).toBe(false);
  });
});
