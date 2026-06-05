import { afterEach, describe, expect, it } from 'vitest';
import { PENDING_JOIN_STORAGE_KEY } from './constants';
import {
  buildInviteUrl,
  captureJoinTokenFromLocation,
  clearLocationJoinParam,
  clearPendingJoinToken,
  parseJoinTokenFromSearch,
  readPendingJoinToken,
  stashPendingJoinToken,
} from './joinUrl';

describe('parseJoinTokenFromSearch', () => {
  it('reads join and token query params', () => {
    expect(parseJoinTokenFromSearch('?join=abc')).toBe('abc');
    expect(parseJoinTokenFromSearch('?token=abc')).toBe('abc');
  });

  it('returns null when no join param', () => {
    expect(parseJoinTokenFromSearch('?tab=settings')).toBeNull();
  });
});

describe('pending join token storage', () => {
  afterEach(() => {
    clearPendingJoinToken();
  });

  it('stashes and reads pending token', () => {
    stashPendingJoinToken('tok-1');
    expect(readPendingJoinToken()).toBe('tok-1');
    clearPendingJoinToken();
    expect(readPendingJoinToken()).toBeNull();
  });
});

describe('clearLocationJoinParam', () => {
  it('removes join from window.location.search', () => {
    window.history.replaceState({}, '', '/?join=abc&x=1');
    clearLocationJoinParam();
    expect(window.location.search).toBe('?x=1');
  });
});

describe('buildInviteUrl', () => {
  it('builds /index.html?join= invite links', () => {
    window.history.replaceState({}, '', '/app/');
    expect(buildInviteUrl('my-token')).toBe(
      `${window.location.origin}/index.html?join=my-token`,
    );
  });
});

describe('captureJoinTokenFromLocation', () => {
  afterEach(() => {
    clearPendingJoinToken();
    window.history.replaceState({}, '', '/');
  });

  it('captures join token from the current URL into storage', () => {
    window.history.replaceState({}, '', '/?join=from-url');
    expect(captureJoinTokenFromLocation()).toBe('from-url');
    expect(window.localStorage.getItem(PENDING_JOIN_STORAGE_KEY)).toBe(
      JSON.stringify('from-url'),
    );
  });
});
