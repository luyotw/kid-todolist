import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    completionsMain: (uid: string) => `users/${uid}/completions/main`,
    settings: (uid: string) => `users/${uid}/meta/settings`,
  },
  subscribeCollection: () => vi.fn(),
  subscribeDoc: () => vi.fn(),
  writeDoc: vi.fn().mockResolvedValue(undefined),
  writeSingleton: vi.fn().mockResolvedValue(undefined),
  removeDoc: vi.fn().mockResolvedValue(undefined),
}));

describe('App cloud data loading', () => {
  it('shows loading state before Firestore subscriptions resolve', () => {
    render(<App />);
    expect(screen.getByText('載入資料中…')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '主要導覽' }),
    ).not.toBeInTheDocument();
  });
});
