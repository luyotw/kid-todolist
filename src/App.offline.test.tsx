import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./lib/firebase', () => ({
  isFirebaseConfigured: true,
  auth: {},
  db: {},
  app: {},
}));

vi.mock('./lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { uid: 'u1', displayName: '家長' },
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOutUser: vi.fn(),
  }),
}));

vi.mock('./lib/firestore', () => ({
  paths: {
    tasks: (uid: string) => `users/${uid}/tasks`,
    adhoc: (uid: string) => `users/${uid}/adhoc`,
    completions: (uid: string) => `users/${uid}/completions`,
    settings: (uid: string) => `users/${uid}/meta/settings`,
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

describe('App offline banner', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
  });

  it('shows offline status when navigator is offline', async () => {
    render(<App />);
    expect(await screen.findByRole('status')).toHaveTextContent(/目前離線/);
  });
});
