import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

const mockAcceptInvite = vi.fn();
const mockCaptureJoinToken = vi.fn();
const mockClearJoinParam = vi.fn();
const mockClearPending = vi.fn();
const mockReadPending = vi.fn();

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { uid: 'user-1', displayName: '家長' },
    loading: false,
    configured: true,
    usingEmulators: false,
    isGuest: false,
    continueAsGuest: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInForLocalDev: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

vi.mock('./lib/firestore', () => ({
  paths: {
    tasks: (uid: string) => `users/${uid}/tasks`,
    adhoc: (uid: string) => `users/${uid}/adhoc`,
    completions: (uid: string) => `users/${uid}/completions`,
    settings: (uid: string) => `users/${uid}/meta/settings`,
    family: {
      membership: (uid: string) => `users/${uid}/meta/membership`,
    },
  },
  subscribeCollection: (_path: string, onData: (items: unknown[]) => void) => {
    onData([]);
    return vi.fn();
  },
  subscribeDoc: (_path: string, onData: (data: unknown) => void) => {
    onData(null);
    return vi.fn();
  },
  writeDoc: vi.fn().mockResolvedValue(undefined),
  writeSingleton: vi.fn().mockResolvedValue(undefined),
  removeDoc: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./lib/family/familyService', () => ({
  acceptInvite: (...args: unknown[]) => mockAcceptInvite(...args),
  createFamily: vi.fn(),
  createInviteToken: vi.fn(),
  getMembership: vi.fn(),
}));

vi.mock('./lib/family/joinUrl', () => ({
  captureJoinTokenFromLocation: () => mockCaptureJoinToken(),
  readPendingJoinToken: () => mockReadPending(),
  clearPendingJoinToken: () => mockClearPending(),
  clearLocationJoinParam: () => mockClearJoinParam(),
  buildInviteUrl: (token: string) => `http://localhost/?join=${token}`,
  parseJoinTokenFromSearch: vi.fn(),
  stashPendingJoinToken: vi.fn(),
}));

describe('App family invite join flow', () => {
  it('accepts pending token after login and clears URL params', async () => {
    mockReadPending.mockReturnValue('pending-token');
    mockAcceptInvite.mockResolvedValue({
      ok: true,
      code: 'JOINED',
      familyId: 'fam-1',
    });

    render(<App />);

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalledWith(
        'user-1',
        'pending-token',
        expect.objectContaining({ online: true }),
      );
    });
    expect(mockClearPending).toHaveBeenCalled();
    expect(mockClearJoinParam).toHaveBeenCalled();
    expect(screen.getByTestId('join-flow-status')).toBeInTheDocument();
  });
});
